import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { processMailPulse } from "@/lib/mail-pulse";

function hasValidCronSecret(request: Request, secret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error("Missing CRON_SECRET");
    return NextResponse.json({ error: "Cron secret is not configured." }, { status: 500 });
  }

  if (!hasValidCronSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processMailPulse();
    if (result.sent) {
      logger.info({ resendId: result.resendId, nextSendAt: result.nextSendAt }, "Mail pulse sent");
    } else {
      logger.info({ nextSendAt: result.nextSendAt }, "Mail pulse not due");
    }
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "Mail pulse processing failed");
    return NextResponse.json({ error: "Unable to process mail pulse." }, { status: 500 });
  }
}
