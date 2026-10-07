import { z } from "zod";

const receivedEmailSchema = z.object({
  id: z.string(),
  to: z.array(z.string()),
  received_for: z.array(z.string()).nullable().optional().transform((value) => value ?? []),
  cc: z.array(z.string()).nullable().optional().transform((value) => value ?? []),
  from: z.string(),
  subject: z.string().nullable().optional().transform((value) => value ?? "(no subject)"),
  html: z.string().nullable().optional().transform((value) => value ?? ""),
  text: z.string().nullable().optional().transform((value) => value ?? ""),
  headers: z.record(z.string()).nullable().optional().transform((value) => value ?? {}),
  message_id: z.string().nullish(),
  attachments: z.array(z.object({
    filename: z.string().nullish(),
    content_type: z.string().nullish(),
    size: z.number().nullish(),
  })).nullable().optional().transform((value) => value ?? []),
});

export async function getReceivedEmail(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY_NOT_CONFIGURED");
  }

  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend receive failed: ${errorText}`);
  }

  const payload: unknown = await response.json();
  return receivedEmailSchema.parse(payload);
}

export async function sendWithResend(input: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; contentType: string; buffer: Buffer }>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY_NOT_CONFIGURED");
  }

  const payload = {
    from: input.from,
    to: input.to,
    cc: input.cc ?? [],
    bcc: input.bcc ?? [],
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: (input.attachments ?? []).map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType,
      content: attachment.buffer.toString("base64"),
    })),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend send failed: ${errorText}`);
  }

  return response.json();
}
