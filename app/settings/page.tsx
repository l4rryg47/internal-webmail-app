import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await db.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <main className="container workspace-page">
      <header className="site-header">
        <div className="brand">Settings</div>
        <nav>
          <Link href="/mail" className="button secondary">Mailbox</Link>
          {user.role === "ADMIN" && <Link href="/admin" className="button secondary">Admin</Link>}
          <Link href="/rules" className="button secondary">Rules</Link>
        </nav>
      </header>

      <section className="panel">
        <h2>Mailbox preferences</h2>
        <form action="/api/settings" method="POST" className="column">
          <div>
            <label htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              name="displayName"
              maxLength={80}
              defaultValue={profile.displayName}
              required
            />
          </div>
          <div>
            <label htmlFor="signatureHtml">Email signature</label>
            <textarea
              id="signatureHtml"
              name="signatureHtml"
              rows={6}
              maxLength={20_000}
              defaultValue={profile.signatureHtml ?? ""}
            />
          </div>
          <div className="form-grid">
            <div>
              <label htmlFor="defaultFolder">Default folder</label>
              <select id="defaultFolder" name="defaultFolder" defaultValue={profile.defaultFolder}>
                <option value="INBOX">Inbox</option>
                <option value="SENT">Sent</option>
                <option value="DRAFTS">Drafts</option>
                <option value="TRASH">Trash</option>
              </select>
            </div>
            <div>
              <label htmlFor="theme">Theme</label>
              <select id="theme" name="theme" defaultValue={profile.theme}>
                <option value="DARK">Dark</option>
                <option value="LIGHT">Light</option>
              </select>
            </div>
            <div>
              <label htmlFor="density">Message list density</label>
              <select id="density" name="density" defaultValue={profile.density}>
                <option value="COMFORTABLE">Comfortable</option>
                <option value="COMPACT">Compact</option>
              </select>
            </div>
          </div>
          <button type="submit">Save mailbox preferences</button>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Change password</h2>
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
