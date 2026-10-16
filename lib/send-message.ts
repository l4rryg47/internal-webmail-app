import { db } from "@/lib/db";
import { getRequiredToRecipients, sendWithResend } from "@/lib/resend";
import { plainTextToHtml } from "@/lib/email-content";
import { formatFromHeader } from "@/lib/email-address";
import type { MessageAttachment } from "@/lib/message-attachments";

interface Sender {
  id: string;
  email: string;
  displayName: string;
  signatureHtml: string | null;
}

interface SendMessageInput {
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  replyToMessageId?: string;
}

export async function sendAndStoreMessage(
  user: Sender,
  input: SendMessageInput,
  attachments: MessageAttachment[],
) {
  const originalMessage = input.replyToMessageId
    ? await db.message.findFirst({
        where: { id: input.replyToMessageId, userId: user.id },
        select: {
          threadId: true,
          thread: { select: { participantEmails: true } },
          messageIdHeader: true,
          inReplyTo: true,
          references: true,
        },
      })
    : null;

  if (input.replyToMessageId && !originalMessage) {
    throw new Error("The message you are replying to could not be found.");
  }

  const fromAddress = user.email;
  const bodyHtml = `${user.signatureHtml ?? ""}\n${input.html || plainTextToHtml(input.text)}`;
  const bodyText = `${user.signatureHtml ? user.signatureHtml.replace(/<[^>]+>/g, "") : ""}\n${input.text}`;
  const references = originalMessage
    ? Array.from(new Set([
        ...(originalMessage.references?.split(/\s+/).filter(Boolean) ?? []),
        ...(originalMessage.inReplyTo?.split(/\s+/).filter(Boolean) ?? []),
        ...(originalMessage.messageIdHeader ? [originalMessage.messageIdHeader] : []),
      ])).join(" ")
    : "";

  const response = await sendWithResend({
    from: formatFromHeader(user.displayName, fromAddress),
    to: getRequiredToRecipients(input.to, fromAddress),
    cc: input.cc,
    bcc: input.bcc,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    subject: input.subject,
    html: bodyHtml,
    text: bodyText,
    attachments,
    ...(originalMessage?.messageIdHeader || references
      ? {
          headers: {
            ...(originalMessage?.messageIdHeader ? { "In-Reply-To": originalMessage.messageIdHeader } : {}),
            ...(references ? { References: references } : {}),
          },
        }
      : {}),
  });

  let threadId: string;
  if (originalMessage) {
    const thread = await db.thread.update({
      where: { id: originalMessage.threadId },
      data: {
        lastMessageAt: new Date(),
        participantEmails: Array.from(new Set([
          ...originalMessage.thread.participantEmails,
          fromAddress,
          ...input.to,
          ...input.cc,
        ])),
      },
    });
    threadId = thread.id;
  } else {
    const thread = await db.thread.create({
      data: {
        userId: user.id,
        subject: input.subject,
        lastMessageAt: new Date(),
        participantEmails: Array.from(new Set([fromAddress, ...input.to, ...input.cc, ...input.bcc])),
      },
    });
    threadId = thread.id;
  }

  const message = await db.message.create({
    data: {
      userId: user.id,
      threadId,
      folder: "SENT",
      direction: "OUTBOUND",
      fromAddress,
      toAddresses: input.to,
      ccAddresses: input.cc,
      subject: input.subject,
      bodyHtml,
      bodyText,
      inReplyTo: originalMessage?.messageIdHeader ?? null,
      references: references || null,
      resendId: response.id,
      isRead: true,
      attachments: {
        create: attachments.map((attachment) => ({
          filename: attachment.filename,
          contentType: attachment.contentType,
          sizeBytes: attachment.buffer.length,
          storagePath: "",
        })),
      },
    },
  });

  return { messageId: message.id, resendId: response.id };
}
