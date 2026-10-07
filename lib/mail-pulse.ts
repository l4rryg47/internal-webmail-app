import { db } from "@/lib/db";
import { sendWithResend } from "@/lib/resend";
import { formatFromHeader } from "@/lib/email-address";

export const MAIL_PULSE_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000;
export const MAIL_PULSE_RECIPIENT = "admin@llctuar.com";
const MAIL_PULSE_ID = "global";

export function getNextMailPulseAt(now = new Date()) {
  return new Date(now.getTime() + MAIL_PULSE_INTERVAL_MS);
}

export async function ensureMailPulseSchedule(now = new Date()) {
  return db.mailPulse.upsert({
    where: { id: MAIL_PULSE_ID },
    create: {
      id: MAIL_PULSE_ID,
      nextSendAt: getNextMailPulseAt(now),
    },
    update: {},
  });
}

export async function processMailPulse(now = new Date()) {
  const schedule = await ensureMailPulseSchedule(now);
  if (schedule.nextSendAt.getTime() > now.getTime()) {
    return { sent: false, nextSendAt: schedule.nextSendAt };
  }

  const dueAt = schedule.nextSendAt;
  const fromAddress = process.env.MAIL_PULSE_FROM_EMAIL ?? MAIL_PULSE_RECIPIENT;
  const fromName = process.env.MAIL_PULSE_FROM_NAME ?? "Webmail Mail Pulse";
  const result = await sendWithResend({
    from: formatFromHeader(fromName, fromAddress),
    to: [MAIL_PULSE_RECIPIENT],
    subject: "Mail Pulse: No action Required.",
    text: "This is a heartbeat check to keep the inbox alive.",
    html: "<p>This is a heartbeat check to keep the inbox alive.</p>",
    idempotencyKey: `mail-pulse/${dueAt.toISOString()}`,
  });
  const sentAt = new Date();
  const nextSendAt = getNextMailPulseAt(sentAt);

  await db.mailPulse.updateMany({
    where: { id: MAIL_PULSE_ID, nextSendAt: dueAt },
    data: {
      nextSendAt,
      lastSentAt: sentAt,
      lastResendId: result.id,
    },
  });

  const updatedSchedule = await db.mailPulse.findUniqueOrThrow({
    where: { id: MAIL_PULSE_ID },
  });

  return {
    sent: true,
    resendId: result.id,
    nextSendAt: updatedSchedule.nextSendAt,
  };
}
