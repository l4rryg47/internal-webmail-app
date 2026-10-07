import { NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { invalidateUserSessions } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return jsonError("FORBIDDEN", "Admin access required.", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const { action } = body;

  if (action === "toggle-active") {
    const user = await db.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return jsonError("USER_NOT_FOUND", "User not found.", 404);
    }

    const updated = await db.user.update({
      where: { id: params.id },
      data: { isActive: !user.isActive },
    });

    if (!updated.isActive) {
      await invalidateUserSessions(updated.id);
    }

    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (action === "change-password") {
    const parsed = z.object({ newPassword: z.string().min(10) }).safeParse(body);
    if (!parsed.success) {
      return jsonError("INVALID_INPUT", "Password must be at least 10 characters.", 400);
    }

    const user = await db.user.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!user) {
      return jsonError("USER_NOT_FOUND", "User not found.", 404);
    }

    const passwordHash = await argon2.hash(parsed.data.newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await invalidateUserSessions(user.id);

    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (action === "delete") {
    if (admin.id === params.id) {
      return jsonError("CANNOT_DELETE_SELF", "You cannot delete your own admin account.", 400);
    }

    const user = await db.user.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!user) {
      return jsonError("USER_NOT_FOUND", "User not found.", 404);
    }

    await db.$transaction(async (transaction) => {
      await transaction.attachment.deleteMany({ where: { message: { userId: user.id } } });
      await transaction.message.deleteMany({ where: { userId: user.id } });
      await transaction.thread.deleteMany({ where: { userId: user.id } });
      await transaction.rule.deleteMany({ where: { userId: user.id } });
      await transaction.session.deleteMany({ where: { userId: user.id } });
      await transaction.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await transaction.user.delete({ where: { id: user.id } });
    });

    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return jsonError("INVALID_ACTION", "Unsupported admin action.", 400);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return POST(request, { params });
}
