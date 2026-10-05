import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { invalidateUserSessions } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
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

    return jsonError("INVALID_ACTION", "Unsupported admin action.", 400);
  } catch (error) {
    return jsonError("FORBIDDEN", "Admin access required.", 403);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return POST(request, { params });
}
