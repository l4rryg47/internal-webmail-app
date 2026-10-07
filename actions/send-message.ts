"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWithResend } from "@/lib/resend";
import { plainTextToHtml } from "@/lib/email-content";
import { formatFromHeader } from "@/lib/email-address";

const sendMessageSchema = z.object({
  to: z.union([
    z.array(z.string().email()),
    z.string().transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean).filter((item) => item.includes("@"))),
  ]),
  cc: z.union([
    z.array(z.string().email()),
    z.string().transform((value) => value ? value.split(",").map((item) => item.trim()).filter(Boolean).filter((item) => item.includes("@")) : []),
  ]).default([]),
  bcc: z.union([
    z.array(z.string().email()),
    z.string().transform((value) => value ? value.split(",").map((item) => item.trim()).filter(Boolean).filter((item) => item.includes("@")) : []),
  ]).default([]),
  subject: z.string().default("(no subject)"),
  html: z.string().default(""),
  text: z.string().default(""),
});

export async function sendMessage(formData: FormData) {
  try {
    const user = await requireUser();
    const rawBody = Object.fromEntries(formData.entries());
    const normalizedBody = {
      ...rawBody,
      to: typeof rawBody.to === "string" ? rawBody.to : rawBody.to ?? [],
      cc: typeof rawBody.cc === "string" ? rawBody.cc : rawBody.cc ?? [],
      bcc: typeof rawBody.bcc === "string" ? rawBody.bcc : rawBody.bcc ?? [],
    };
    const parsed = sendMessageSchema.safeParse(normalizedBody);

    if (!parsed.success) {
      return { success: false, error: "Message payload is invalid." };
    }

    const { to, cc, bcc, subject, html, text } = parsed.data;
    const fromAddress = user.email;
    const bodyHtml = `${user.signatureHtml ?? ""}\n${html || plainTextToHtml(text)}`;
    const bodyText = `${user.signatureHtml ? user.signatureHtml.replace(/<[^>]+>/g, "") : ""}\n${text}`;

    const response = await sendWithResend({
      from: formatFromHeader(user.displayName, fromAddress),
      to,
      cc,
      bcc,
      subject,
      html: bodyHtml,
      text: bodyText,
    });

    const thread = await db.thread.create({
      data: {
        userId: user.id,
        subject,
        lastMessageAt: new Date(),
        participantEmails: Array.from(new Set([fromAddress, ...to, ...cc, ...bcc])),
      },
    });

    const message = await db.message.create({
      data: {
        userId: user.id,
        threadId: thread.id,
        folder: "SENT",
        direction: "OUTBOUND",
        fromAddress,
        toAddresses: to,
        ccAddresses: cc,
        subject,
        bodyHtml,
        bodyText,
        resendId: response.id,
        isRead: true,
      },
    });

    return { success: true, messageId: message.id, resendId: response.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to send email." };
  }
}
