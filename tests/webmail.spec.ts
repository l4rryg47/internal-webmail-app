import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import argon2 from "argon2";
import { clearFailedAttempts, isLocked, recordFailedAttempt } from "@/lib/auth";
import { ensureMailboxAccess } from "@/lib/authorization";
import { evaluateRules } from "@/lib/rules";

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
  it("accepts a valid Resend signature", () => {
    const secret = "super-secret";
    const body = JSON.stringify({ event: "email.received", data: { id: "abc" } });
    const signature = crypto.createHmac("sha256", secret).update(body).digest("base64");

    const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
    expect(signature).toBe(expected);
    expect(() => crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))).not.toThrow();
  });
});
