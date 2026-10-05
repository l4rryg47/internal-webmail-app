import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") ?? "INBOX";
    const messages = await db.message.findMany({
      where: { userId: user.id, folder: folder as any },
      orderBy: { receivedAt: "desc" },
      take: 25,
    });

    return NextResponse.json(messages);
  } catch (error) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}
