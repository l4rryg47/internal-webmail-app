CREATE TABLE "MailPulse" (
    "id" TEXT NOT NULL,
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "lastResendId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailPulse_pkey" PRIMARY KEY ("id")
);
