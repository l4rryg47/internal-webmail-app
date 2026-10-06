import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/mailbox/AppShell";

export default async function MailPage() {
  const user = await requireUser();

  // Fetch folder counts
  const [inboxCount, sentCount, draftsCount, trashCount] = await Promise.all([
    db.message.count({ where: { userId: user.id, folder: "INBOX" } }),
    db.message.count({ where: { userId: user.id, folder: "SENT" } }),
    db.message.count({ where: { userId: user.id, folder: "DRAFTS" } }),
    db.message.count({ where: { userId: user.id, folder: "TRASH" } }),
  ]);

  const folderCounts = {
    INBOX: inboxCount,
    SENT: sentCount,
    DRAFTS: draftsCount,
    TRASH: trashCount,
  };

  return (
    <AppShell
      userRole={user.role}
      userEmail={user.email}
      folderCounts={folderCounts}
    />
  );
}
