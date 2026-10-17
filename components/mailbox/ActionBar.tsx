"use client";

interface ActionBarProps {
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onDelete: () => void;
  onToggleFlag: () => void;
  isFlagged: boolean;
  isTrashed: boolean;
  disabled?: boolean;
}

export function ActionBar({
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onToggleFlag,
  isFlagged,
  isTrashed,
  disabled = false,
}: ActionBarProps) {
  return (
    <div className="action-bar">
      <button
        className="action-button primary"
        onClick={onReply}
        disabled={disabled}
        aria-label="Reply to message"
        title="Reply (R)"
      >
        Reply
      </button>
      <button className="action-button" onClick={onReplyAll} disabled={disabled} aria-label="Reply to all" title="Reply All (A)">
        Reply All
      </button>
      <button className="action-button" onClick={onForward} disabled={disabled} aria-label="Forward message" title="Forward (F)">
        Forward
      </button>
      <button className="action-button danger" onClick={onDelete} disabled={disabled} aria-label={isTrashed ? "Restore message" : "Delete message"} title={isTrashed ? "Restore to Inbox (D)" : "Move to Trash (D)"}>
        {isTrashed ? "Restore" : "Delete"}
      </button>
      <button className="action-button" onClick={onToggleFlag} disabled={disabled} aria-pressed={isFlagged} aria-label={isFlagged ? "Unflag message" : "Flag message"} title={isFlagged ? "Remove flag (L)" : "Flag (L)"}>
        {isFlagged ? "Unflag" : "Flag"}
      </button>
    </div>
  );
}
