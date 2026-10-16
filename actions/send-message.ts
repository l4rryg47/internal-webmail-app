"use server";

import { requireUser } from "@/lib/auth";
import { SendMessageSchema } from "@/lib/validation";
import { parseMessageAttachments } from "@/lib/message-attachments";
import { sendAndStoreMessage } from "@/lib/send-message";

export async function sendMessage(formData: FormData) {
  try {
    const user = await requireUser();
    const rawBody = Object.fromEntries(
      Array.from(formData.entries()).filter(([key]) => key !== "attachments"),
    );
    const parsed = SendMessageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return { success: false, error: "Message payload is invalid." };
    }

    const attachments = await parseMessageAttachments(formData);
    const result = await sendAndStoreMessage(user, parsed.data, attachments);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to send email." };
  }
}
