import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await db.user.findUnique({ where: { id: user.id } });

  return (
    <main className="container">
      <header className="site-header">
        <div className="brand">Settings</div>
        <nav>
          <Link href="/mail" className="button secondary">Mailbox</Link>
          <Link href="/rules" className="button secondary">Rules</Link>
        </nav>
      </header>

      <section className="panel">
        <form action="/api/settings" method="POST" className="column">
          <label htmlFor="signature">Email signature</label>
          <textarea id="signature" name="signatureHtml" rows={6} defaultValue={profile?.signatureHtml ?? ""} />
          <button type="submit">Save signature</button>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <form action="/api/auth/change-password" method="POST" className="column">
          <div>
            <label htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" minLength={10} required />
          </div>
          <div>
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" minLength={10} required />
          </div>
          <button type="submit">Change password</button>
        </form>
      </section>
    </main>
  );
}
