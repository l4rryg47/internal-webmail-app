import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { MessageUpdateSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const message = await db.message.findFirst({
      where: { id: params.id, userId: user.id },
      include: { attachments: true },
    });

    if (!message) {
      return jsonError("MESSAGE_NOT_FOUND", "Message not found.", 404);
    }

    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const message = await db.message.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!message) {
      return jsonError("MESSAGE_NOT_FOUND", "Message not found.", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("INVALID_INPUT", "Message update payload must be valid JSON.", 400);
    }
    const parsed = MessageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("INVALID_INPUT", "Message update payload is invalid.", 400);
    }

    const updatedMessage = await db.message.update({
      where: { id: message.id },
      data: parsed.data,
    });
    return NextResponse.json(updatedMessage);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
    }
    throw error;
  }
}
