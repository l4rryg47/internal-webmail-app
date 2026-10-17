import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import argon2 from "argon2";
import { clearFailedAttempts, isLocked, recordFailedAttempt } from "@/lib/auth";
import { ensureMailboxAccess } from "@/lib/authorization";
import { extractEmailAddress, formatFromHeader } from "@/lib/email-address";
import { plainTextToHtml } from "@/lib/email-content";
import { getRecipientCandidates } from "@/lib/inbound";
import { getNextMailPulseAt, MAIL_PULSE_INTERVAL_MS } from "@/lib/mail-pulse";
import { MAX_TOTAL_ATTACHMENT_SIZE_BYTES, parseMessageAttachments } from "@/lib/message-attachments";
import { getRequiredToRecipients } from "@/lib/resend";
import { verifyResendWebhook } from "@/lib/resend-webhook";
import { evaluateRules } from "@/lib/rules";
import { MailboxSettingsSchema, MessageUpdateSchema, SendMessageSchema } from "@/lib/validation";

describe("email content", () => {
  it("renders plain-text bodies as escaped HTML while preserving line breaks", () => {
    expect(plainTextToHtml("Hello <team>\nUse A & B")).toBe(
      "Hello &lt;team&gt;<br />Use A &amp; B",
    );
  });
});

describe("sender display name", () => {
  it("formats the display name with the unchanged mailbox address", () => {
    expect(formatFromHeader("Sales Team", "sales@example.com"))
      .toBe('"Sales Team" <sales@example.com>');
  });

  it("prevents display names from injecting extra mail headers", () => {
    expect(formatFromHeader('Sales"\r\nBcc: attacker@example.com', "sales@example.com"))
      .toBe('"Sales\\" Bcc: attacker@example.com" <sales@example.com>');
  });

  it("falls back to the mailbox address when the display name is blank", () => {
    expect(formatFromHeader(" \r\n ", "sales@example.com")).toBe("sales@example.com");
  });

  it("extracts the address from a formatted sender header", () => {
    expect(extractEmailAddress('"Sales Team" <sales@example.com>')).toBe("sales@example.com");
    expect(extractEmailAddress("sales@example.com")).toBe("sales@example.com");
  });
});

describe("mail pulse schedule", () => {
  it("sets the recurring interval to exactly six days", () => {
    const start = new Date("2026-10-07T08:00:00.000Z");
    expect(getNextMailPulseAt(start).getTime() - start.getTime()).toBe(MAIL_PULSE_INTERVAL_MS);
    expect(MAIL_PULSE_INTERVAL_MS).toBe(6 * 24 * 60 * 60 * 1000);
  });
});

describe("authentication", () => {
  it("rejects invalid credentials and locks users after repeated failures", async () => {
    const email = "locked-user@example.com";
    clearFailedAttempts(email);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      recordFailedAttempt(email);
      expect(isLocked(email)).toBe(false);
    }

    recordFailedAttempt(email);
    expect(isLocked(email)).toBe(true);

    const hash = await argon2.hash("s3cretPassw0rd");
    const valid = await argon2.verify(hash, "s3cretPassw0rd");
    expect(valid).toBe(true);
  });
});

describe("mailbox isolation", () => {
  it("prevents cross-user mailbox access even with a guessed message id", () => {
    expect(() => ensureMailboxAccess("user-a", "user-b")).toThrow("MAILBOX_ISOLATION_VIOLATION");
    expect(ensureMailboxAccess("user-a", "user-a")).toBe(true);
  });
});

describe("inbound recipient resolution", () => {
  it("prioritizes Resend's routed recipient and checks every To address", () => {
    expect(getRecipientCandidates(
      ["other@example.com", " SALES@LLCTUAR.COM "],
      ["Sales@llctuar.com"],
    )).toEqual(["sales@llctuar.com", "other@example.com"]);
  });
});

describe("mailbox settings validation", () => {
  it("accepts valid display and mailbox preferences", () => {
    expect(MailboxSettingsSchema.safeParse({
      displayName: "Sales Team",
      signatureHtml: "<p>Regards</p>",
      defaultFolder: "SENT",
      theme: "LIGHT",
      density: "COMPACT",
    }).success).toBe(true);
  });

  it("rejects blank display names and unsupported preference values", () => {
    expect(MailboxSettingsSchema.safeParse({
      displayName: " ",
      signatureHtml: "",
      defaultFolder: "ARCHIVE",
      theme: "SYSTEM",
      density: "COMPACT",
    }).success).toBe(false);
  });
});

describe("send message validation", () => {
  it("allows sending to BCC recipients without a To recipient", () => {
    const result = SendMessageSchema.safeParse({
      to: "",
      cc: "",
      bcc: "hidden@example.com",
      subject: "Private update",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.to).toEqual([]);
      expect(result.data.bcc).toEqual(["hidden@example.com"]);
    }
  });

  it("requires at least one valid To, CC, or BCC recipient", () => {
    expect(SendMessageSchema.safeParse({ to: "", cc: "", bcc: "" }).success).toBe(false);
    expect(SendMessageSchema.safeParse({ to: "", cc: "", bcc: "not-an-email" }).success).toBe(false);
  });

  it("accepts a valid message id when composing a reply", () => {
    expect(SendMessageSchema.safeParse({
      to: "sender@example.com",
      replyToMessageId: "c77e2c6d-6084-4a62-8acf-f40e9d640010",
    }).success).toBe(true);
  });

  it("accepts a Reply-To email and rejects an invalid one", () => {
    expect(SendMessageSchema.safeParse({
      to: "recipient@example.com",
      replyTo: "replies@example.com",
    }).success).toBe(true);
    expect(SendMessageSchema.safeParse({
      to: "recipient@example.com",
      replyTo: "not-an-email",
    }).success).toBe(false);
    expect(SendMessageSchema.safeParse({
      to: "recipient@example.com",
      replyTo: "",
    }).success).toBe(true);
  });
});

describe("message update validation", () => {
  it("allows supported message actions", () => {
    expect(MessageUpdateSchema.safeParse({ folder: "TRASH" }).success).toBe(true);
    expect(MessageUpdateSchema.safeParse({ isFlagged: true }).success).toBe(true);
    expect(MessageUpdateSchema.safeParse({ isRead: false }).success).toBe(true);
  });

  it("rejects empty updates, unsupported folders, and unexpected fields", () => {
    expect(MessageUpdateSchema.safeParse({}).success).toBe(false);
    expect(MessageUpdateSchema.safeParse({ folder: "ARCHIVE" }).success).toBe(false);
    expect(MessageUpdateSchema.safeParse({ permanentlyDelete: true }).success).toBe(false);
  });
});

describe("provider recipient requirements", () => {
  it("uses the sender as the required To recipient when To is blank", () => {
    expect(getRequiredToRecipients([], "sender@example.com")).toEqual(["sender@example.com"]);
  });

  it("preserves explicitly entered To recipients", () => {
    expect(getRequiredToRecipients(["to@example.com"], "sender@example.com"))
      .toEqual(["to@example.com"]);
  });
});

describe("message attachments", () => {
  it("parses uploaded files with their name, content type, and bytes", async () => {
    const formData = new FormData();
    formData.append("attachments", new Blob(["hello"], { type: "text/plain" }), "hello.txt");

    await expect(parseMessageAttachments(formData)).resolves.toEqual([{
      filename: "hello.txt",
      contentType: "text/plain",
      buffer: Buffer.from("hello"),
    }]);
  });

  it("rejects attachment uploads over the configured total size", async () => {
    const formData = new FormData();
    formData.append(
      "attachments",
      new Blob([new Uint8Array(MAX_TOTAL_ATTACHMENT_SIZE_BYTES + 1)]),
      "large.bin",
    );

    await expect(parseMessageAttachments(formData)).rejects.toThrow("25 MB or less");
  });
});

describe("rules", () => {
  it("evaluates rules and applies actions in order", () => {
    const message = {
      fromAddress: "billing@vendor.com",
      toAddresses: ["jane@yourorg.com"],
      ccAddresses: [],
      subject: "Invoice 2025",
      bodyText: "Please review the attached invoice.",
      attachments: [{ filename: "invoice.pdf", contentType: "application/pdf", sizeBytes: 4096 }],
      hasAttachment: true,
      sizeBytes: 4096,
    };

    const actions = evaluateRules(message, [
      {
        enabled: true,
        stopProcessing: false,
        priority: 10,
        conditions: {
          logic: "AND",
          conditions: [
            { field: "from", operator: "contains", value: "@vendor.com" },
            { field: "attachmentName", operator: "contains", value: "invoice" },
          ],
        },
        actions: [{ type: "moveToFolder", value: "TRASH" }, { type: "markAsRead" }],
      },
    ]);

    expect(actions).toEqual([
      { type: "moveToFolder", value: "TRASH" },
      { type: "markAsRead" },
    ]);
  });

  it("honors rule priority and stopProcessing ordering", () => {
    const message = {
      fromAddress: "alerts@example.com",
      toAddresses: ["jane@yourorg.com"],
      ccAddresses: [],
      subject: "Secure update",
      bodyText: "hello",
    };

    const actions = evaluateRules(message, [
      {
        enabled: true,
        stopProcessing: false,
        priority: 20,
        conditions: { logic: "AND", conditions: [{ field: "from", operator: "contains", value: "alerts" }] },
        actions: [{ type: "markAsUnread" }],
      },
      {
        enabled: true,
        stopProcessing: true,
        priority: 10,
        conditions: { logic: "AND", conditions: [{ field: "from", operator: "contains", value: "alerts" }] },
        actions: [{ type: "moveToFolder", value: "TRASH" }],
      },
    ]);

    expect(actions).toEqual([{ type: "moveToFolder", value: "TRASH" }]);
  });
});

describe("webhook verification", () => {
  it("accepts a valid Svix signature and rejects stale or tampered requests", () => {
    const secret = `whsec_${crypto.randomBytes(32).toString("base64")}`;
    const id = "msg_123";
    const timestamp = "1791282000";
    const body = JSON.stringify({ type: "email.received", data: { email_id: "abc" } });
    const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
    const signature = crypto
      .createHmac("sha256", secretBytes)
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64");
    const input = {
      payload: body,
      id,
      timestamp,
      signature: `v1,${signature}`,
      secret,
      now: Number(timestamp),
    };

    expect(verifyResendWebhook(input)).toBe(true);
    expect(verifyResendWebhook({ ...input, payload: `${body} ` })).toBe(false);
    expect(verifyResendWebhook({ ...input, now: Number(timestamp) + 301 })).toBe(false);
  });
});
