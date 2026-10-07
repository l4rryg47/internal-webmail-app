"use client";

interface FolderSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onCompose: () => void;
  folderCounts?: Record<string, number>;
  isDrawerOpen?: boolean;
}

const folders = [
  { id: "INBOX", name: "Inbox", icon: "M4 5h16v14H4z M4 6l8 7 8-7" },
  { id: "SENT", name: "Sent", icon: "M22 2 11 13 M22 2l-7 20-4-9-9-4z" },
  { id: "DRAFTS", name: "Drafts", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8" },
  { id: "TRASH", name: "Trash", icon: "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v5 M14 11v5" },
];

export function FolderSidebar({ selectedFolder, onFolderSelect, onCompose, folderCounts, isDrawerOpen = false }: FolderSidebarProps) {
  return (
    <div className={`folder-sidebar ${isDrawerOpen ? "drawer-open" : ""}`}>
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
            <button
              key={folder.id}
              className={`folder-item ${selectedFolder === folder.id ? "active" : ""}`}
              onClick={() => onFolderSelect(folder.id)}
              aria-current={selectedFolder === folder.id ? "page" : undefined}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={folder.icon} />
                </svg>
                <span>{folder.name}</span>
              </div>
              {folder.id === "INBOX" && count > 0 && (
                <span className="folder-badge">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="folder-divider" />

      <a href="/rules" className="folder-item">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span aria-hidden="true">⚙</span>
          <span>Rules</span>
        </div>
      </a>
    </div>
  );
}
