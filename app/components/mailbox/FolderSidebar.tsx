"use client";

interface FolderSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onCompose: () => void;
  folderCounts?: Record<string, number>;
}

const folders = [
  { id: "INBOX", name: "Inbox", icon: "📥" },
  { id: "SENT", name: "Sent", icon: "📤" },
  { id: "DRAFTS", name: "Drafts", icon: "📝" },
  { id: "TRASH", name: "Trash", icon: "🗑️" },
];

export function FolderSidebar({ selectedFolder, onFolderSelect, onCompose, folderCounts }: FolderSidebarProps) {
  return (
    <div className="folder-sidebar">
      <button className="compose-button" onClick={onCompose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Compose
      </button>

      <div className="folder-list">
        {folders.map((folder) => {
          const count = folderCounts?.[folder.id] || 0;
          return (
            <div
              key={folder.id}
              className={`folder-item ${selectedFolder === folder.id ? "active" : ""}`}
              onClick={() => onFolderSelect(folder.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{folder.icon}</span>
                <span>{folder.name}</span>
              </div>
              {count > 0 && (
                <span className="folder-badge">{count}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="folder-divider" />

      <a href="/rules" className="folder-item" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>⚙️</span>
          <span>Rules</span>
        </div>
      </a>
    </div>
  );
}
