import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { handleIncomingMessage } from "@/lib/inbound";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-resend-signature") ?? request.headers.get("resend-signature") ?? request.headers.get("X-Resend-Signature");
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    logger.error("Missing RESEND_WEBHOOK_SECRET");
    return jsonError("CONFIG_ERROR", "Webhook secret not configured.", 500);
  }

  if (!signature) {
    logger.warn("Missing Resend signature header");
    return jsonError("INVALID_SIGNATURE", "Missing webhook signature.", 401);
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const expectedBuffer = Buffer.from(expected, "base64");
  const signatureBuffer = Buffer.from(signature, "base64");

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    logger.warn("Resend webhook rejected: invalid signature");
    return jsonError("INVALID_SIGNATURE", "Invalid webhook signature.", 401);
  }

  try {
    const payload = JSON.parse(rawBody);
    const emailPayload = payload.data ?? payload;
    const messagePayload = {
      to: Array.isArray(emailPayload.to) ? emailPayload.to.map((recipient: string) => recipient.toString()) : [String(emailPayload.to ?? "")],
      from: String(emailPayload.from ?? ""),
      subject: String(emailPayload.subject ?? "(no subject)"),
      text: String(emailPayload.text ?? emailPayload.html ?? ""),
      html: String(emailPayload.html ?? emailPayload.text ?? ""),
      headers: {
        "Message-ID": emailPayload.message_id ?? emailPayload.headers?.["Message-ID"],
        "In-Reply-To": emailPayload.headers?.["In-Reply-To"],
        References: emailPayload.headers?.References,
      },
      attachments: Array.isArray(emailPayload.attachments) ? emailPayload.attachments.map((attachment: any) => ({
        filename: attachment.filename ?? "attachment",
        contentType: attachment.content_type ?? attachment.contentType ?? "application/octet-stream",
        sizeBytes: Number(attachment.size ?? attachment.size_bytes ?? 0),
        path: attachment.path ?? "",
      })) : [],
    };

    await handleIncomingMessage(messagePayload);
    logger.info({ event: payload.event ?? "email.received", messageId: emailPayload.id ?? null }, "Resend webhook received");
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, "Error processing Resend webhook");
    return jsonError("WEBHOOK_PROCESSING_FAILED", "Unable to process webhook payload.", 500);
  }
}
