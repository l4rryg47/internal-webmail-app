import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { MailPulseCountdown } from "@/components/admin/MailPulseCountdown";
import { ensureMailPulseSchedule } from "@/lib/mail-pulse";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [users, mailPulse] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    ensureMailPulseSchedule(),
  ]);

  return (
    <main className="container workspace-page">
      <header className="site-header">
        <div className="brand">Admin panel</div>
        <nav>
          <Link href="/mail" className="button secondary">Mailbox</Link>
        </nav>
      </header>

      <MailPulseCountdown
        nextSendAt={mailPulse.nextSendAt.toISOString()}
        lastSentAt={mailPulse.lastSentAt?.toISOString() ?? null}
      />

      <section className="panel">
        <h2>Create user</h2>
        <form action="/api/admin/users" method="POST" className="form-grid" style={{ marginBottom: 24 }}>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="displayName">Display name</label>
            <input id="displayName" name="displayName" required />
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <select id="role" name="role">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div>
            <label htmlFor="password">Temporary password</label>
            <input id="password" name="password" type="password" minLength={10} />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button type="submit">Create user</button>
          </div>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Users</h2>
        <div className="workspace-table-wrap">
        <table className="workspace-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Email</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Display name</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Role</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Created</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: "10px 8px" }}>{user.email}</td>
                <td style={{ padding: "10px 8px" }}>{user.displayName}</td>
                <td style={{ padding: "10px 8px" }}>{user.role}</td>
                <td style={{ padding: "10px 8px" }}>{user.isActive ? "Active" : "Inactive"}</td>
                <td style={{ padding: "10px 8px" }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "10px 8px" }}>
                  <AdminUserActions
                    userId={user.id}
                    email={user.email}
                    canDelete={user.id !== admin.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </main>
  );
}
