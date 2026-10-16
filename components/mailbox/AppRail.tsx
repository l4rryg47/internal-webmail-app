"use client";

interface AppRailProps {
  activeNav: "mail" | "rules" | "admin" | "settings";
  onNavChange: (nav: "mail" | "rules" | "admin" | "settings") => void;
  userRole?: "USER" | "ADMIN";
  userEmail?: string;
  userDisplayName?: string;
}

export function AppRail({ activeNav, onNavChange, userRole, userEmail, userDisplayName }: AppRailProps) {
  const getInitials = (name?: string) => {
    if (!name) return "?";
    const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
    return initials.toUpperCase();
  };
  const accountName = userDisplayName || userEmail || "User";

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
        <button className={`top-nav-item ${activeNav === "settings" ? "active" : ""}`} onClick={() => onNavChange("settings")}>
          Settings
        </button>
        {userRole === "ADMIN" && (
          <button className={`top-nav-item ${activeNav === "admin" ? "active" : ""}`} onClick={() => onNavChange("admin")}>
            Admin
          </button>
        )}
      </nav>

      <div className="top-nav-spacer" />
      <span className="account-email" title={userEmail}>{accountName}</span>
      <button className="account-avatar" title={`${accountName} (${userEmail || "no email"})`} aria-label={`Signed in as ${accountName}`}>
        {getInitials(userDisplayName || userEmail)}
      </button>
      <button className="logout-button" onClick={handleLogout}>Sign out</button>
    </header>
  );
}
