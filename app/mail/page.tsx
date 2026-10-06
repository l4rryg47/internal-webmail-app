import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MailPage() {
  const user = await requireUser();
  const threads = await db.thread.findMany({
    where: { userId: user.id },
    orderBy: { lastMessageAt: "desc" },
    take: 20,
    include: {
      messages: {
        orderBy: { receivedAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <main className="container">
      <header className="site-header">
        <div className="brand">Mailbox</div>
        <nav>
          <Link href="/compose" className="button">Compose</Link>
          <Link href="/settings" className="button secondary">Settings</Link>
          {user.role === "ADMIN" && <Link href="/admin" className="button secondary">Admin</Link>}
          <Link href="/rules" className="button secondary">Rules</Link>
        </nav>
      </header>

      <section className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <strong>Folders</strong>
            <div className="muted">Inbox, Sent, Drafts, Trash</div>
          </div>
          <Link href="/compose" className="button">Compose</Link>
        </div>

        <div style={{ marginTop: 24 }}>
          {threads.length === 0 ? (
            <p className="muted">No messages yet.</p>
          ) : (
            threads.map((thread) => {
              const latestMessage = thread.messages[0];
              return (
                <Link key={thread.id} href={`/mail/${thread.id}`} style={{ display: "block" }}>
                  <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <strong>{thread.subject || "(no subject)"}</strong>
                      <span className="muted">{new Date(thread.lastMessageAt).toLocaleString()}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 8 }}>
                      {thread.participantEmails.join(", ") || "No participants"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {latestMessage ? latestMessage.bodyText.slice(0, 120) || latestMessage.bodyHtml.slice(0, 120) : "No preview"}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
