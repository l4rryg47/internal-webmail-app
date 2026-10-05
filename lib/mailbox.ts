import { db } from "@/lib/db";
import { ensureMailboxAccess } from "@/lib/authorization";

export async function getUserMailbox(userId: string, targetUserId: string) {
  ensureMailboxAccess(userId, targetUserId);
  return db.message.findMany({
    where: { userId: targetUserId },
    orderBy: { receivedAt: "desc" },
    take: 25,
  });
}
