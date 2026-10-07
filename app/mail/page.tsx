import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/mailbox/AppShell";

export default async function MailPage() {
  const user = await requireUser();

  const inboxUnreadCount = await db.message.count({
    where: { userId: user.id, folder: "INBOX", isRead: false },
  });

  const folderCounts = {
    INBOX: inboxUnreadCount,
  };

  return (
    <AppShell
      userRole={user.role}
      userEmail={user.email}
      folderCounts={folderCounts}
    />
  );
}
