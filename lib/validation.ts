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
