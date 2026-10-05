import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { SESSION_COOKIE_NAME, clearFailedAttempts, createSessionForUser, isLocked, recordFailedAttempt, verifyPassword } from "@/lib/auth";
import { LoginSchema } from "@/lib/validation";

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_REQUESTS = 10;

export async function POST(request: Request) {
  const clientKey = request.headers.get("x-forwarded-for") ?? "local";
  if (checkRateLimit(`login:${clientKey}`, LOGIN_MAX_REQUESTS, LOGIN_WINDOW_MS)) {
    return jsonError("RATE_LIMITED", "Too many login attempts. Please wait a minute and try again.", 429);
  }

  const formData = await request.formData();
  const payload = Object.fromEntries(formData.entries());
  const parsed = LoginSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError("INVALID_INPUT", "Please provide a valid email and password.", 400);
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  if (isLocked(normalizedEmail)) {
    return jsonError("ACCOUNT_LOCKED", "This account is temporarily locked due to repeated failed sign-ins.", 429);
  }

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.isActive) {
    recordFailedAttempt(normalizedEmail);
    return jsonError("INVALID_CREDENTIALS", "Incorrect email or password.", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordFailedAttempt(normalizedEmail);
    return jsonError("INVALID_CREDENTIALS", "Incorrect email or password.", 401);
  }

  clearFailedAttempts(normalizedEmail);
  const session = await createSessionForUser(user.id, new Date(Date.now() + 1000 * 60 * 60 * 12));

  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: session.id,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.redirect(new URL("/mail", request.url));
}
