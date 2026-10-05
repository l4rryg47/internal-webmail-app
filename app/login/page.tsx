import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="container centered">
      <div className="card auth-box">
        <h1>Company Mail</h1>
        <p className="muted">Use your work email and password to continue.</p>

        <form action="/api/login" method="POST" className="column">
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" minLength={10} required />
          </div>

          <button type="submit">Sign in</button>
        </form>

        <div style={{ marginTop: 16 }}>
          <Link href="/" className="muted">Return home</Link>
        </div>
      </div>
    </main>
  );
}
