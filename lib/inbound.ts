import { db } from "@/lib/db";
import { evaluateRules } from "@/lib/rules";

export async function resolveThreadForIncomingMessage(input: {
  userId: string;
  subject: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  references?: string | null;
  inReplyTo?: string | null;
  messageIdHeader?: string | null;
}) {
  const participantEmails = Array.from(new Set([...input.toAddresses, ...input.ccAddresses, input.fromAddress]));

  if (input.references || input.inReplyTo || input.messageIdHeader) {
    const existingThread = await db.thread.findFirst({
      where: {
        userId: input.userId,
        OR: [
          { messages: { some: { messageIdHeader: input.messageIdHeader ?? undefined } } },
          { messages: { some: { inReplyTo: input.inReplyTo ?? undefined } } },
          { messages: { some: { references: input.references ?? undefined } } },
        ],
      },
      include: { messages: true },
    });

    if (existingThread) {
      return existingThread;
    }
  }

  const normalizedSubject = input.subject.trim() || "(no subject)";
  const candidateThread = await db.thread.findFirst({
    where: {
      userId: input.userId,
      subject: normalizedSubject,
      participantEmails: { hasSome: participantEmails },
    },
    include: { messages: true },
  });

  if (candidateThread) {
    return candidateThread;
  }

  return db.thread.create({
    data: {
      userId: input.userId,
      subject: normalizedSubject,
      lastMessageAt: new Date(),
      participantEmails,
    },
  });
}

export async function handleIncomingMessage(payload: {
  to: string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string | undefined>;
  attachments?: Array<{ filename?: string; contentType?: string; sizeBytes?: number; path?: string }>;
}) {
  const targetEmail = payload.to?.[0]?.toLowerCase();
  if (!targetEmail) {
    throw new Error("NO_TARGET_RECIPIENT");
  }

  const user = await db.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const thread = await resolveThreadForIncomingMessage({
    userId: user.id,
    subject: payload.subject ?? "(no subject)",
    fromAddress: payload.from,
    toAddresses: payload.to,
    ccAddresses: [],
    references: payload.headers?.References,
    inReplyTo: payload.headers?.["In-Reply-To"],
    messageIdHeader: payload.headers?.["Message-ID"],
  });

  const createdMessage = await db.message.create({
    data: {
      userId: user.id,
      threadId: thread.id,
      folder: "INBOX",
      direction: "INBOUND",
      fromAddress: payload.from,
      toAddresses: payload.to,
      ccAddresses: [],
      subject: payload.subject ?? "(no subject)",
      bodyHtml: payload.html ?? payload.text ?? "",
      bodyText: payload.text ?? payload.html ?? "",
      messageIdHeader: payload.headers?.["Message-ID"],
      inReplyTo: payload.headers?.["In-Reply-To"],
      references: payload.headers?.References,
      receivedAt: new Date(),
      isRead: false,
      attachments: {
        create: (payload.attachments ?? []).map((attachment) => ({
          filename: attachment.filename ?? "attachment",
          contentType: attachment.contentType ?? "application/octet-stream",
          sizeBytes: attachment.sizeBytes ?? 0,
          storagePath: attachment.path ?? "",
        })),
      },
    },
    include: { attachments: true },
  });

  await db.thread.update({
    where: { id: thread.id },
    data: { lastMessageAt: createdMessage.receivedAt, participantEmails: Array.from(new Set([...thread.participantEmails, payload.from, ...payload.to])) },
  });

  const rules = await db.rule.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "asc" },
  });

  const appliedActions = evaluateRules(
    {
      fromAddress: payload.from,
      toAddresses: payload.to,
      ccAddresses: [],
      subject: payload.subject ?? "(no subject)",
      bodyText: payload.text ?? "",
      bodyHtml: payload.html ?? "",
      attachments: (payload.attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
      })),
      hasAttachment: (payload.attachments ?? []).length > 0,
      sizeBytes: (payload.attachments ?? []).reduce((sum, attachment) => sum + (attachment.sizeBytes ?? 0), 0),
    },
    rules.map((rule) => ({
      enabled: rule.enabled,
      stopProcessing: rule.stopProcessing,
      conditions: rule.conditions as any,
      actions: rule.actions as any,
    })),
  );

  for (const action of appliedActions) {
    if (action.type === "moveToFolder") {
      await db.message.update({ where: { id: createdMessage.id }, data: { folder: action.value as any } });
    }
    if (action.type === "markAsRead") {
      await db.message.update({ where: { id: createdMessage.id }, data: { isRead: true } });
    }
    if (action.type === "markAsUnread") {
      await db.message.update({ where: { id: createdMessage.id }, data: { isRead: false } });
    }
    if (action.type === "flag") {
      await db.message.update({ where: { id: createdMessage.id }, data: { isFlagged: true } });
    }
  }

  return createdMessage;
}
