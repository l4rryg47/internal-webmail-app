import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Password must be at least 10 characters."),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["ADMIN", "USER"]),
  password: z.string().min(10).optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(10),
  newPassword: z.string().min(10),
});

const EmailRecipientsSchema = z.union([
  z.array(z.string().email()),
  z.string()
    .transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean))
    .pipe(z.array(z.string().email())),
]);

export const SendMessageSchema = z.object({
  to: EmailRecipientsSchema.default([]),
  cc: EmailRecipientsSchema.default([]),
  bcc: EmailRecipientsSchema.default([]),
  replyTo: z.string().trim().email().or(z.literal("")).optional(),
  subject: z.string().default("(no subject)"),
  html: z.string().default(""),
  text: z.string().default(""),
  replyToMessageId: z.string().uuid().optional(),
}).refine(
  ({ to, cc, bcc }) => to.length + cc.length + bcc.length > 0,
  { message: "At least one recipient is required." },
);

export const MailboxSettingsSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  signatureHtml: z.string().max(20_000),
  defaultFolder: z.enum(["INBOX", "SENT", "DRAFTS", "TRASH"]),
  theme: z.enum(["DARK", "LIGHT"]),
  density: z.enum(["COMFORTABLE", "COMPACT"]),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
});

export const MessageSchema = z.object({
  to: z.array(z.string().email()).default([]),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  subject: z.string().default("(no subject)"),
  bodyHtml: z.string().default(""),
  bodyText: z.string().default(""),
  attachments: z.array(
    z.object({
      filename: z.string(),
      contentType: z.string(),
      buffer: z.instanceof(Buffer),
    }),
  ).default([]),
});
