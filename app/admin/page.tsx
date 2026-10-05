import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPage() {
  await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <main className="container">
      <header className="site-header">
        <div className="brand">Admin panel</div>
        <nav>
          <Link href="/" className="button secondary">Home</Link>
        </nav>
      </header>

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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Email</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Display name</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Role</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Created</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
