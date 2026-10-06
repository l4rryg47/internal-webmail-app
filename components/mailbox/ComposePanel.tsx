"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { sendMessage } from "@/actions/send-message";
import "react-quill/dist/quill.snow.css";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface ComposePanelProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  replyToThreadId?: string | null;
}

export function ComposePanel({
  isOpen,
  isMinimized,
  onClose,
  onToggleMinimize,
  replyToThreadId,
}: ComposePanelProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData();
    formData.append("to", to);
    formData.append("cc", cc);
    formData.append("subject", subject);
    formData.append("html", html);

    const result = await sendMessage(formData);

    setIsSending(false);

    if (result.success) {
      onClose();
      // Reset form
      setTo("");
      setCc("");
      setSubject("");
      setHtml("");
    } else {
      alert(result.error || "Failed to send message");
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  };

  const quillFormats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "link",
  ];

  return (
    <div className={`compose-panel ${isMinimized ? "minimized" : ""}`}>
      <div className="compose-header" onClick={onToggleMinimize}>
        <span className="compose-title">
          {replyToThreadId ? "Reply to Message" : "New Message"}
        </span>
        <div className="compose-actions">
          <button
            className="compose-action"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>
          <button
            className="compose-action"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="compose-content">
          <form className="compose-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="compose-input"
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              disabled={isSending}
            />
            <input
              type="text"
              className="compose-input"
              placeholder="CC"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              disabled={isSending}
            />
            <input
              type="text"
              className="compose-input"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
            <div style={{ minHeight: "200px" }}>
              <ReactQuill
                theme="snow"
                value={html}
                onChange={setHtml}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Write your message here..."
                style={{ height: "200px" }}
              />
            </div>
            <div className="compose-footer">
              <button type="submit" className="action-button primary" disabled={isSending}>
                {isSending ? "Sending..." : "Send"}
              </button>
              <button type="button" className="action-button" onClick={onClose} disabled={isSending}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
