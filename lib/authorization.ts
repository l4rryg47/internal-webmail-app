export function ensureMailboxAccess(currentUserId: string, targetUserId: string) {
  if (currentUserId !== targetUserId) {
    throw new Error("MAILBOX_ISOLATION_VIOLATION");
  }

  return true;
}
