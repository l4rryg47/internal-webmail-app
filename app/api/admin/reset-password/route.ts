import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { createPasswordResetToken } from "@/lib/reset";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const { userId } = body;

    if (!userId) {
      return jsonError("INVALID_INPUT", "User id is required.", 400);
    }

    const user = await db.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      return jsonError("USER_NOT_FOUND", "User not found.", 404);
    }

    const result = await createPasswordResetToken(user.id);
    return NextResponse.redirect(new URL(`/reset-password?token=${result.token}`, request.url));
  } catch (error) {
    return jsonError("FORBIDDEN", "Admin access required.", 403);
  }
}
