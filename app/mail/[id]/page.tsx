import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MailThreadPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const thread = await db.thread.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      messages: {
        orderBy: { receivedAt: "asc" },
        include: { attachments: true },
      },
    },
  });

  if (!thread) {
    notFound();
  }

  return (
    <main className="container">
      <header className="site-header">
        <div className="brand">Thread</div>
        <nav>
          <Link href="/mail" className="button secondary">Back to mailbox</Link>
          <Link href="/compose" className="button">Compose</Link>
        </nav>
      </header>

      <section className="panel">
        <h2>{thread.subject || "(no subject)"}</h2>
        <p className="muted">Participants: {thread.participantEmails.join(", ") || "None"}</p>

        <div className="column" style={{ marginTop: 24 }}>
          {thread.messages.map((message) => (
            <div key={message.id} className="card" style={{ padding: 18 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{message.fromAddress}</strong>
                <span className="muted">{new Date(message.receivedAt).toLocaleString()}</span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                To: {message.toAddresses.join(", ") || "—"}
              </div>
              <div dangerouslySetInnerHTML={{ __html: message.bodyHtml || message.bodyText }} style={{ marginTop: 16 }} />
              {message.attachments.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>Attachments</strong>
                  <ul>
                    {message.attachments.map((attachment) => (
                      <li key={attachment.id}>{attachment.filename}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
