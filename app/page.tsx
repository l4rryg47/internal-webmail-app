import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <header className="site-header">
        <div className="brand">Internal Webmail</div>
        <nav>
          <Link href="/login" className="button">Login</Link>
          <Link href="/admin" className="button secondary">Admin</Link>
        </nav>
      </header>

      <section className="hero">
        <h1>Internal communications, only for authorized staff</h1>
        <p className="muted">
          Built for secure, role-based org email with mailbox isolation, server-side session handling,
          and Resend-backed sending and receiving.
        </p>
        <div className="row">
          <Link href="/login" className="button">Open mailbox</Link>
          <Link href="/settings" className="button secondary">Settings</Link>
        </div>
      </section>
    </main>
  );
}
