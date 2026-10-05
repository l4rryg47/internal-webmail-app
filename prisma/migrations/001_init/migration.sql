CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "Folder" AS ENUM ('INBOX', 'SENT', 'DRAFTS', 'TRASH');
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "signatureHtml" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "participantEmails" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Thread_userId_lastMessageAt_idx" ON "Thread"("userId", "lastMessageAt");

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "folder" "Folder" NOT NULL DEFAULT 'INBOX',
    "direction" "Direction" NOT NULL,
    "messageIdHeader" TEXT,
    "inReplyTo" TEXT,
    "references" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddresses" TEXT[] NOT NULL,
    "ccAddresses" TEXT[] NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "resendId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchVector" tsvector,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Message_userId_folder_idx" ON "Message"("userId", "folder");
CREATE INDEX "Message_searchVector_idx" ON "Message" USING GIN ("searchVector");

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL,
    "stopProcessing" BOOLEAN NOT NULL DEFAULT false,
    "conditionLogic" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Rule_userId_priority_idx" ON "Rule"("userId", "priority");

CREATE TRIGGER "message_search_vector_update"
BEFORE INSERT OR UPDATE OF "subject", "bodyText" ON "Message"
FOR EACH ROW
EXECUTE FUNCTION tsvector_update_trigger("searchVector", 'pg_catalog.english', "subject", "bodyText");
