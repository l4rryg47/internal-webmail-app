import Image from "next/image";

export default function HomePage() {
  return (
    <main className="container centered login-page">
      <div className="card auth-box login-card">
        <Image
          className="login-logo"
          src="/webmail-logo.png"
          alt="Webmail logo"
          width={134}
          height={114}
          priority
        />
        <h1>Webmail Login</h1>
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
        <footer className="login-footer">Powered by Alchemy Intell 2.0</footer>
      </div>
    </main>
  );
}
