import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function ComposePage() {
  await requireUser();

  return (
    <main className="container">
      <header className="site-header">
        <div className="brand">Compose</div>
        <nav>
          <Link href="/mail" className="button secondary">Mailbox</Link>
        </nav>
      </header>

      <section className="panel">
        <form action="/api/messages/send" method="POST" className="column">
          <div className="form-grid">
            <div>
              <label htmlFor="to">To</label>
              <input id="to" name="to" type="text" placeholder="name@domain.com" required />
            </div>
            <div>
              <label htmlFor="cc">CC</label>
              <input id="cc" name="cc" type="text" placeholder="Optional" />
            </div>
            <div>
              <label htmlFor="subject">Subject</label>
              <input id="subject" name="subject" type="text" placeholder="Subject" />
            </div>
          </div>

          <div>
            <label htmlFor="message">Message</label>
            <textarea id="message" name="text" rows={10} placeholder="Write your message here..."></textarea>
          </div>

          <div className="row">
            <button type="submit">Send</button>
            <Link href="/mail" className="button secondary">Cancel</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
