import { NextResponse } from "next/server";
import argon2 from "argon2";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { CreateUserSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireAdmin();
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    return jsonError("UNAUTHORIZED", "Admin access required.", 403);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("INVALID_INPUT", "One or more fields are invalid.", 400);
    }

    const { email, displayName, role, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const passwordHash = password
      ? await argon2.hash(password)
      : await argon2.hash("TemporaryPassword123!");

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        displayName,
        role,
        passwordHash,
      },
    });

    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (error) {
    return jsonError("UNAUTHORIZED", "Admin access required.", 403);
  }
}
