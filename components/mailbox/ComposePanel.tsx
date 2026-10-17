"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { sendMessage } from "@/actions/send-message";
import { extractEmailAddress } from "@/lib/email-address";
import { plainTextToHtml } from "@/lib/email-content";
import "react-quill/dist/quill.snow.css";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface ComposePanelProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  sourceMessageId?: string | null;
  mode?: "new" | "reply" | "replyAll" | "forward";
  userEmail?: string;
  onSent: () => void;
}

interface ReplyMessage {
  id: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
  direction: "INBOUND" | "OUTBOUND";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === '"') return "&quot;";
    return "&#39;";
  });
}

export function ComposePanel({
  isOpen,
  isMinimized,
  onClose,
  onToggleMinimize,
  sourceMessageId,
  mode = "new",
  userEmail,
  onSent,
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
    if (!sourceMessageId) return;

    let cancelled = false;
    setIsLoadingReply(true);
    setReplyError("");

    async function loadReplyMessage() {
      try {
        const response = await fetch(`/api/messages/${sourceMessageId}`);
        if (!response.ok) {
          throw new Error("Unable to load the message you are replying to.");
        }
        const message = await response.json() as ReplyMessage;
        if (cancelled) return;

        const currentEmail = userEmail?.toLowerCase();
        const sender = extractEmailAddress(message.fromAddress);
        const senderIsCurrentUser = sender.toLowerCase() === currentEmail;
        const otherRecipients = [...message.toAddresses, ...message.ccAddresses]
          .map(extractEmailAddress)
          .filter((address) => address && address.toLowerCase() !== currentEmail);
        const uniqueOtherRecipients = Array.from(new Set(
          otherRecipients.filter((address) => address.toLowerCase() !== sender.toLowerCase()),
        ));
        const replyToAddress = senderIsCurrentUser ? uniqueOtherRecipients.shift() : sender;
        setTo(mode === "forward" ? "" : replyToAddress || "");
        setCc(mode === "replyAll" ? uniqueOtherRecipients.join(", ") : "");

        const subject = message.subject || "(no subject)";
        setSubject(mode === "forward"
          ? (/^fwd?:/i.test(subject) ? subject : `Fwd: ${subject}`)
          : (/^re:/i.test(subject) ? subject : `Re: ${subject}`));

        const body = message.bodyHtml || plainTextToHtml(message.bodyText);
        const quoteHeader = mode === "forward"
          ? `<p>---------- Forwarded message ----------<br>From: ${escapeHtml(message.fromAddress)}<br>Sent: ${escapeHtml(new Date(message.receivedAt).toLocaleString())}<br>Subject: ${escapeHtml(subject)}</p>`
          : `<p>On ${escapeHtml(new Date(message.receivedAt).toLocaleString())}, ${escapeHtml(message.fromAddress)} wrote:</p>`;
        setHtml(`<p><br></p>${quoteHeader}<blockquote>${body}</blockquote>`);
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
  }, [sourceMessageId, mode, userEmail]);

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
    if (sourceMessageId && (mode === "reply" || mode === "replyAll")) {
      formData.append("replyToMessageId", sourceMessageId);
    }
    attachments.forEach((attachment) => formData.append("attachments", attachment));

    try {
      const result = await sendMessage(formData);
      if (result.success) {
        setTo("");
        setCc("");
        setBcc("");
        setReplyTo("");
        setSubject("");
        setHtml("");
        setAttachments([]);
        if (fileInput.current) fileInput.current.value = "";
        onSent();
        onClose();
      } else {
        setReplyError(result.error || "Failed to send message");
      }
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
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
          {mode === "forward" ? "Forward Message" : mode === "replyAll" ? "Reply All" : mode === "reply" ? "Reply to Message" : "New Message"}
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
