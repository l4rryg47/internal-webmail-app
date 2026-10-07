import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function RulesPage() {
  const user = await requireUser();
  const rules = await db.rule.findMany({
    where: { userId: user.id },
    orderBy: { priority: "asc" },
  });

  return (
    <main className="container workspace-page">
      <header className="site-header">
        <div className="brand">Rules</div>
        <nav>
          <Link href="/mail" className="button secondary">Mailbox</Link>
        </nav>
      </header>

      <section className="panel">
        <h2>Create rule</h2>
        <form action="/api/rules" method="POST" className="form-grid">
          <div>
            <label htmlFor="name">Rule name</label>
            <input id="name" name="name" required />
          </div>
          <div>
            <label htmlFor="priority">Priority</label>
            <input id="priority" name="priority" type="number" defaultValue={100} />
          </div>
          <div>
            <label htmlFor="conditionLogic">Condition logic</label>
            <select id="conditionLogic" name="conditionLogic">
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>
          <div>
            <label htmlFor="enabled">Enabled</label>
            <select id="enabled" name="enabled">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label htmlFor="stopProcessing">Stop processing</label>
            <select id="stopProcessing" name="stopProcessing">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <div style={{ alignSelf: "end" }}>
            <button type="submit">Add rule</button>
          </div>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Rule list</h2>
        {rules.length === 0 ? (
          <p className="muted">No rules yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rules.map((rule) => (
              <li key={rule.id} className="card rule-card" style={{ padding: 16, marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{rule.name}</strong>
                  <span className="muted">Priority {rule.priority}</span>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  {rule.enabled ? "Enabled" : "Disabled"} · {rule.stopProcessing ? "Stop processing" : "Continue"} · {rule.conditionLogic}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
