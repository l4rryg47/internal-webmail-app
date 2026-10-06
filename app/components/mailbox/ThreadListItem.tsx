"use client";

interface Thread {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  timestamp: string;
  isUnread: boolean;
  isFlagged: boolean;
  hasAttachment: boolean;
}

interface ThreadListItemProps {
  thread: Thread;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}

export function ThreadListItem({ thread, isSelected, isFocused, onClick }: ThreadListItemProps) {
  return (
    <div
      className={`thread-item ${isSelected ? "selected" : ""} ${thread.isUnread ? "unread" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      aria-label={`${thread.subject} from ${thread.sender}`}
    >
      <div className="thread-header">
        <span className="thread-sender">{thread.sender}</span>
        <span className="thread-time">{thread.timestamp}</span>
      </div>
      <div className="thread-subject">{thread.subject}</div>
      <div className="thread-snippet">{thread.snippet}</div>
      <div className="thread-meta">
        {thread.isFlagged && (
          <span className="thread-flag" title="Flagged" aria-label="Flagged">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </span>
        )}
        {thread.hasAttachment && (
          <span className="thread-attachment" title="Has attachment" aria-label="Has attachment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
