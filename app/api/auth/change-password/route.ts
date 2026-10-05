import { NextResponse } from "next/server";
import argon2 from "argon2";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { ChangePasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const parsed = ChangePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("INVALID_INPUT", "Current and new password are required.", 400);
    }

    const { currentPassword, newPassword } = parsed.data;
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      return jsonError("INVALID_CREDENTIALS", "Current password is incorrect.", 401);
    }

    const passwordHash = await argon2.hash(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "You must be logged in to change your password.", 401);
  }
}
