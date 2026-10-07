import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { jsonError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("FORBIDDEN", "Admin access required.", 403);
  }

  try {
    const schedule = await db.mailPulse.findUniqueOrThrow({ where: { id: "global" } });
    return NextResponse.json({
      nextSendAt: schedule.nextSendAt,
      lastSentAt: schedule.lastSentAt,
    });
  } catch (error) {
    logger.error({ err: error }, "Unable to load mail pulse schedule");
    return jsonError("MAIL_PULSE_UNAVAILABLE", "Unable to load mail pulse schedule.", 500);
  }
}
