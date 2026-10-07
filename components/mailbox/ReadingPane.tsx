"use client";

import { useEffect, useState } from "react";
import { MessageHeader } from "./MessageHeader";
import { MessageBody } from "./MessageBody";
import { ActionBar } from "./ActionBar";

interface ReadingPaneProps {
  threadId: string | null;
  onReply: () => void;
  onBack: () => void;
}

interface Message {
  id: string;
  subject: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  receivedAt: string;
  bodyText: string;
  bodyHtml: string;
  attachments: Array<{
    id: string;
    filename: string;
    contentType: string;
    size?: number;
  }>;
}

export function ReadingPane({ threadId, onReply, onBack }: ReadingPaneProps) {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    async function fetchMessage() {
      if (!threadId) {
        setMessage(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/messages/${threadId}`);
        if (response.ok) {
          const data = await response.json();
          setMessage(data);
        }
      } catch (error) {
        console.error("Failed to fetch message:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessage();
  }, [threadId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!message) return;
      // Only handle shortcuts when not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onReply();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [message, onReply]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (!threadId) {
    return (
      <div className="reading-pane">
        <div className="empty-state">
          <div className="empty-state-icon">📧</div>
          <div className="empty-state-title">Select a message to read it</div>
          <div className="empty-state-description">
            Choose a thread from the list to view its contents
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reading-pane">
        <div className="reading-pane-content">
          <div className="skeleton skeleton-header" style={{ marginBottom: "24px" }} />
          <div className="skeleton skeleton-row" style={{ width: "40%", marginBottom: "12px" }} />
          <div className="skeleton skeleton-row" style={{ width: "60%", marginBottom: "24px" }} />
          <div className="skeleton skeleton-body" style={{ marginBottom: "8px" }} />
          <div className="skeleton skeleton-body" style={{ marginBottom: "8px" }} />
          <div className="skeleton skeleton-body" style={{ marginBottom: "8px" }} />
          <div className="skeleton skeleton-body" style={{ marginBottom: "8px" }} />
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="reading-pane">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-title">Couldn&apos;t load this message</div>
          <div className="empty-state-description">Try again</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`reading-pane ${isMobileView ? "active" : ""}`}>
      {isMobileView && (
        <button
          className="action-button"
          style={{ margin: "12px 16px", width: "fit-content" }}
          onClick={onBack}
        >
          ← Back
        </button>
      )}
      <div className="reading-pane-content">
        <MessageHeader
          subject={message.subject || "(no subject)"}
          from={message.fromAddress}
          to={[...message.toAddresses, ...message.ccAddresses]}
          date={formatDate(message.receivedAt)}
        />
        <MessageBody body={message.bodyHtml || message.bodyText} />
        {message.attachments && message.attachments.length > 0 && (
          <div className="attachments-row">
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="attachment-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {attachment.filename}
                {attachment.size && (
                  <span style={{ marginLeft: "4px", opacity: 0.7 }}>
                    ({formatFileSize(attachment.size)})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ActionBar onReply={onReply} />
    </div>
  );
}
