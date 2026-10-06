"use client";

interface ActionBarProps {
  onReply: () => void;
}

export function ActionBar({ onReply }: ActionBarProps) {
  return (
    <div className="action-bar">
      <button
        className="action-button primary"
        onClick={onReply}
        aria-label="Reply to message"
        title="Reply (R)"
      >
        Reply
      </button>
      <button className="action-button" aria-label="Reply to all" title="Reply All (A)">
        Reply All
      </button>
      <button className="action-button" aria-label="Forward message" title="Forward (F)">
        Forward
      </button>
      <button className="action-button danger" aria-label="Delete message" title="Delete (D)">
        Delete
      </button>
      <button className="action-button" aria-label="Flag message" title="Flag (L)">
        Flag
      </button>
    </div>
  );
}
