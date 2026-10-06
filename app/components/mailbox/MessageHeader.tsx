"use client";

interface MessageHeaderProps {
  subject: string;
  from: string;
  to: string[];
  date: string;
}

export function MessageHeader({ subject, from, to, date }: MessageHeaderProps) {
  const getInitials = (email: string) => {
    const name = email.split("<")[0].trim();
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="message-header">
      <h2 className="message-subject">{subject}</h2>
      <div className="message-meta">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--accent)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            {getInitials(from)}
          </div>
          <div>
            <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>
              {from}
            </div>
            <div style={{ fontSize: "12px" }}>
              To: {to.join(", ")}
            </div>
          </div>
        </div>
        <div>{date}</div>
      </div>
    </div>
  );
}
