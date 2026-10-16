"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { sendMessage } from "@/actions/send-message";
import { extractEmailAddress } from "@/lib/email-address";
import "react-quill/dist/quill.snow.css";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface ComposePanelProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  replyToMessageId?: string | null;
}

interface ReplyMessage {
  fromAddress: string;
  toAddresses: string[];
  subject: string;
  direction: "INBOUND" | "OUTBOUND";
}

export function ComposePanel({
  isOpen,
  isMinimized,
  onClose,
  onToggleMinimize,
  replyToMessageId,
}: ComposePanelProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyError, setReplyError] = useState("");
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!replyToMessageId) return;

    let cancelled = false;
    setIsLoadingReply(true);
    setReplyError("");

    async function loadReplyMessage() {
      try {
        const response = await fetch(`/api/messages/${replyToMessageId}`);
        if (!response.ok) {
          throw new Error("Unable to load the message you are replying to.");
        }
        const message = await response.json() as ReplyMessage;
        if (cancelled) return;

        const recipient = message.direction === "OUTBOUND"
          ? message.toAddresses[0]
          : message.fromAddress;
        setTo(recipient ? extractEmailAddress(recipient) : "");
        setSubject(/^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject || "(no subject)"}`);
      } catch (error) {
        if (!cancelled) {
          setReplyError(error instanceof Error ? error.message : "Unable to load the reply details.");
        }
      } finally {
        if (!cancelled) setIsLoadingReply(false);
      }
    }

    void loadReplyMessage();
    return () => {
      cancelled = true;
    };
  }, [replyToMessageId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData();
    formData.append("to", to);
    formData.append("cc", cc);
    formData.append("bcc", bcc);
    formData.append("replyTo", replyTo);
    formData.append("subject", subject);
    formData.append("html", html);
    if (replyToMessageId) formData.append("replyToMessageId", replyToMessageId);
    attachments.forEach((attachment) => formData.append("attachments", attachment));

    const result = await sendMessage(formData);

    setIsSending(false);

    if (result.success) {
      onClose();
      // Reset form
      setTo("");
      setCc("");
      setBcc("");
      setReplyTo("");
      setSubject("");
      setHtml("");
      setAttachments([]);
      if (fileInput.current) fileInput.current.value = "";
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

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`compose-panel ${isMinimized ? "minimized" : ""}`}>
      <div className="compose-header" onClick={onToggleMinimize}>
        <span className="compose-title">
          {replyToMessageId ? "Reply to Message" : "New Message"}
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
            {replyError && <div className="compose-error" role="alert">{replyError}</div>}
            <input
              type="text"
              className="compose-input"
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSending || isLoadingReply}
            />
            {isLoadingReply && <div className="compose-reply-loading">Loading reply details...</div>}
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
              placeholder="BCC"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              disabled={isSending}
            />
            <input
              type="email"
              className="compose-input"
              placeholder="Reply-To (optional)"
              aria-label="Reply-To email address"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              disabled={isSending}
            />
            <div className="compose-subject-row">
              <input
                type="text"
                className="compose-input"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSending || isLoadingReply}
              />
              <div className="compose-attachments">
                <label className="action-button compose-attach-button" htmlFor="compose-attachments">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  {attachments.length > 0 ? "Add more files" : "Attach files"}
                </label>
                <input
                  ref={fileInput}
                  id="compose-attachments"
                  type="file"
                  multiple
                  onChange={(event) => {
                    setAttachments((current) => [
                      ...current,
                      ...Array.from(event.target.files ?? []),
                    ]);
                    event.target.value = "";
                  }}
                  disabled={isSending}
                />
              </div>
            </div>
            {attachments.length > 0 && (
              <div className="compose-attachment-confirmation" aria-live="polite">
                <div className="compose-attachment-count">
                  {attachments.length} {attachments.length === 1 ? "file" : "files"} attached
                </div>
                <ul className="compose-attachment-list">
                  {attachments.map((attachment, index) => (
                    <li key={`${attachment.name}-${attachment.lastModified}-${index}`}>
                      <svg className="compose-attachment-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span className="compose-attachment-name" title={attachment.name}>{attachment.name}</span>
                      <span className="compose-attachment-size">{formatFileSize(attachment.size)}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${attachment.name}`}
                        onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        disabled={isSending}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="compose-editor">
              <ReactQuill
                theme="snow"
                value={html}
                onChange={setHtml}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Write your message here..."
              />
            </div>
            <div className="compose-footer">
              <button type="submit" className="action-button primary" disabled={isSending || isLoadingReply || Boolean(replyError)}>
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
