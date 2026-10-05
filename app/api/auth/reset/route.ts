import { NextResponse } from "next/server";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { consumePasswordResetToken } from "@/lib/reset";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const { token, password } = body;

  if (!token || typeof password !== "string" || password.length < 10) {
    return jsonError("INVALID_INPUT", "A valid reset token and new password are required.", 400);
  }

  const user = await consumePasswordResetToken(String(token));
  if (!user) {
    return jsonError("INVALID_TOKEN", "This password reset link is invalid or expired.", 400);
  }

  const passwordHash = await argon2.hash(password);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.redirect(new URL("/login", request.url));
}
