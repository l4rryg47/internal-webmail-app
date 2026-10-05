import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { ensureMailboxAccess } from "@/lib/authorization";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const message = await db.message.findUnique({
      where: { id: params.id },
      include: { attachments: true },
    });

    if (!message) {
      return jsonError("MESSAGE_NOT_FOUND", "Message not found.", 404);
    }

    ensureMailboxAccess(user.id, message.userId);
    return NextResponse.json(message);
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}
