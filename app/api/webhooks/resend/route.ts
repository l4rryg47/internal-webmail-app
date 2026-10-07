import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { handleIncomingMessage } from "@/lib/inbound";
import { getReceivedEmail } from "@/lib/resend";
import { verifyResendWebhook } from "@/lib/resend-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    logger.error("Missing RESEND_WEBHOOK_SECRET");
    return jsonError("CONFIG_ERROR", "Webhook secret not configured.", 500);
  }

  if (!verifyResendWebhook({
    payload: rawBody,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    secret,
  })) {
    logger.warn("Resend webhook rejected: invalid signature");
    return jsonError("INVALID_SIGNATURE", "Invalid webhook signature.", 401);
  }

  try {
    const payload = JSON.parse(rawBody);
    if (payload.type !== "email.received") {
      logger.info({ event: payload.type ?? null }, "Ignoring unrelated Resend webhook event");
      return NextResponse.json({ received: true });
    }

    const emailId = payload.data?.email_id;
    if (typeof emailId !== "string" || !emailId) {
      return jsonError("INVALID_PAYLOAD", "Received email ID is missing.", 400);
    }

    const emailPayload = await getReceivedEmail(emailId);
    const messagePayload = {
      to: emailPayload.to,
      receivedFor: emailPayload.received_for,
      cc: emailPayload.cc,
      from: emailPayload.from,
      subject: emailPayload.subject,
      text: emailPayload.text || emailPayload.html,
      html: emailPayload.html || emailPayload.text,
      headers: {
        "Message-ID": emailPayload.message_id ?? emailPayload.headers["message-id"],
        "In-Reply-To": emailPayload.headers["in-reply-to"],
        References: emailPayload.headers.references,
      },
      attachments: emailPayload.attachments.map((attachment) => ({
        filename: attachment.filename ?? "attachment",
        contentType: attachment.content_type ?? "application/octet-stream",
        sizeBytes: attachment.size ?? 0,
      })),
    };

    await handleIncomingMessage(messagePayload);
    logger.info({ event: payload.type, messageId: emailId }, "Resend webhook received");
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, "Error processing Resend webhook");
    return jsonError("WEBHOOK_PROCESSING_FAILED", "Unable to process webhook payload.", 500);
  }
}
