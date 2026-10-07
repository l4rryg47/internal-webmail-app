export default function HomePage() {
  return (
    <main className="container centered login-page">
      <div className="card auth-box login-card">
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
      </div>
    </main>
  );
}
