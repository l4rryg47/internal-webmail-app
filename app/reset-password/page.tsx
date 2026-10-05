export default function ResetPasswordPage({ searchParams }: { searchParams?: { token?: string } }) {
  return (
    <main className="container centered">
      <div className="card auth-box">
        <h1>Reset password</h1>
        <p className="muted">Set a new password for your account.</p>

        <form action="/api/auth/reset" method="POST" className="column">
          <input type="hidden" name="token" value={searchParams?.token ?? ""} />
          <div>
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" minLength={10} required />
          </div>
          <button type="submit">Update password</button>
        </form>
      </div>
    </main>
  );
}
