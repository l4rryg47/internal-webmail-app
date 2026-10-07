import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import argon2 from "argon2";
import { clearFailedAttempts, isLocked, recordFailedAttempt } from "@/lib/auth";
import { ensureMailboxAccess } from "@/lib/authorization";
import { formatFromHeader } from "@/lib/email-address";
import { plainTextToHtml } from "@/lib/email-content";
import { getRecipientCandidates } from "@/lib/inbound";
import { getNextMailPulseAt, MAIL_PULSE_INTERVAL_MS } from "@/lib/mail-pulse";
import { verifyResendWebhook } from "@/lib/resend-webhook";
import { evaluateRules } from "@/lib/rules";

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
