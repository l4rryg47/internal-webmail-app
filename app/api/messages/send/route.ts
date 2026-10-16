import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { AttachmentValidationError, parseMessageAttachments } from "@/lib/message-attachments";
import { sendAndStoreMessage } from "@/lib/send-message";
import { SendMessageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get("content-type") ?? "";
    const formData = contentType.includes("application/json") ? null : await request.formData();
    const rawBody = formData
      ? Object.fromEntries(Array.from(formData.entries()).filter(([key]) => key !== "attachments"))
      : await request.json();
    const parsed = SendMessageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonError("INVALID_INPUT", "Message payload is invalid.", 400);
    }

    const attachments = formData ? await parseMessageAttachments(formData) : [];
    const result = await sendAndStoreMessage(user, parsed.data, attachments);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AttachmentValidationError) {
      return jsonError("INVALID_ATTACHMENT", error.message, 400);
    }
    return jsonError("SEND_FAILED", error instanceof Error ? error.message : "Unable to send email.", 500);
  }
}
