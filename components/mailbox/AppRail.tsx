"use client";

interface AppRailProps {
  activeNav: "mail" | "rules" | "admin";
  onNavChange: (nav: "mail" | "rules" | "admin") => void;
  userRole?: "USER" | "ADMIN";
  userEmail?: string;
}

export function AppRail({ activeNav, onNavChange, userRole, userEmail }: AppRailProps) {
  const getInitials = (email?: string) => {
    if (!email) return "?";
    const name = email.split("@")[0];
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (response.ok) {
        window.location.replace("/login");
      } else {
        console.error("Logout failed:", response.statusText);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.replace("/login");
    }
  };

  return (
    <header className="app-rail">
      <a className="mailbox-brand" href="/mail" aria-label="Internal Mail home">
        <span className="mailbox-brand-mark" aria-hidden="true">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </span>
        <span>Internal Mail</span>
      </a>

      <nav className="top-nav" aria-label="Main navigation">
        <button className={`top-nav-item ${activeNav === "mail" ? "active" : ""}`} onClick={() => onNavChange("mail")}>
          Mail
        </button>
        <button className={`top-nav-item ${activeNav === "rules" ? "active" : ""}`} onClick={() => onNavChange("rules")}>
          Rules
        </button>
        {userRole === "ADMIN" && (
          <button className={`top-nav-item ${activeNav === "admin" ? "active" : ""}`} onClick={() => onNavChange("admin")}>
            Admin
          </button>
        )}
      </nav>

      <div className="top-nav-spacer" />
      <span className="account-email">{userEmail}</span>
      <button className="account-avatar" title={userEmail || "Account"} aria-label={`Signed in as ${userEmail || "user"}`}>
        {getInitials(userEmail)}
      </button>
      <button className="logout-button" onClick={handleLogout}>Sign out</button>
    </header>
  );
}
