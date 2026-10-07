"use client";

import { useState, useEffect, useRef } from "react";
import { SearchBar } from "./SearchBar";
import { ThreadListItem } from "./ThreadListItem";

interface ThreadListProps {
  folder: string;
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  refreshKey: number;
  onRefresh: () => void;
  onMessageRead: () => void;
}

interface Message {
  id: string;
  subject: string;
  fromAddress: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
  folder: string;
  toAddresses: string[];
  ccAddresses: string[];
  attachments: any[];
  isRead: boolean;
  isFlagged: boolean;
}

export function ThreadList({
  folder,
  selectedThreadId,
  onThreadSelect,
  searchQuery,
  onSearchChange,
  refreshKey,
  onRefresh,
  onMessageRead,
}: ThreadListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const markingRead = useRef(new Set<string>());

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      try {
        const response = await fetch(`/api/messages?folder=${folder}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [folder, refreshKey]);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSenderName = (email: string) => {
    const match = email.match(/^(.+?)\s*<.+>$/);
    return match ? match[1].trim() : email.split("@")[0];
  };

  const getSnippet = (bodyText: string, bodyHtml: string) => {
    const text = bodyText || bodyHtml.replace(/<[^>]+>/g, "");
    return text.slice(0, 120) + (text.length > 120 ? "..." : "");
  };

  const filteredMessages = messages
    .filter((message) => !unreadOnly || !message.isRead)
    .filter((message) =>
      !searchQuery ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.fromAddress.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const listToolbar = (
    <div className="message-list-toolbar">
      <div className="message-list-title">
        {folder === "INBOX" ? "Inbox" : folder[0] + folder.slice(1).toLowerCase()}
      </div>
      <span className="message-count">{filteredMessages.length} shown</span>
      <button
        className="toolbar-button"
        onClick={() => setUnreadOnly((value) => !value)}
        aria-pressed={unreadOnly}
      >
        Unread
      </button>
      <button className="toolbar-button icon-only" onClick={onRefresh} aria-label="Refresh messages" title="Refresh">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
        </svg>
      </button>
    </div>
  );

  const handleMessageSelect = async (message: Message, index: number) => {
    onThreadSelect(message.id);
    setSelectedIndex(index);
    if (folder !== "INBOX" || message.isRead || markingRead.current.has(message.id)) return;

    markingRead.current.add(message.id);
    try {
      const response = await fetch(`/api/messages/${message.id}`, { method: "PATCH" });
      if (!response.ok) {
        console.error("Failed to mark message as read:", response.statusText);
        return;
      }
      setMessages((current) => current.map((item) => (
        item.id === message.id ? { ...item, isRead: true } : item
      )));
      onMessageRead();
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    } finally {
      markingRead.current.delete(message.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredMessages.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      void handleMessageSelect(filteredMessages[selectedIndex], selectedIndex);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIndex(filteredMessages.length - 1);
    }
  };

  if (loading) {
    return (
      <div className="thread-list">
        <SearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />
        {listToolbar}
        <div className="thread-list-content">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ padding: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="skeleton skeleton-header" style={{ width: "60%", marginBottom: "8px" }} />
              <div className="skeleton skeleton-row" style={{ width: "40%", marginBottom: "4px" }} />
              <div className="skeleton skeleton-row" style={{ width: "80%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="thread-list" onKeyDown={handleKeyDown} tabIndex={0}>
      <SearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />
      {listToolbar}
      <div className="thread-list-content">
        {filteredMessages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No messages found</div>
            <div className="empty-state-description">
              {searchQuery ? "Try a different search term" : "No messages in this folder"}
            </div>
          </div>
        ) : (
          filteredMessages.map((message, index) => (
            <ThreadListItem
              key={message.id}
              thread={{
                id: message.id,
                subject: message.subject || "(no subject)",
                sender: getSenderName(message.fromAddress),
                senderInitial: getSenderName(message.fromAddress).slice(0, 1).toUpperCase(),
                senderColor: `hsl(${getSenderName(message.fromAddress).charCodeAt(0) * 13 % 360} 42% 38%)`,
                snippet: getSnippet(message.bodyText, message.bodyHtml),
                timestamp: formatTimestamp(message.receivedAt),
                isUnread: !message.isRead,
                isFlagged: message.isFlagged,
                hasAttachment: message.attachments ? message.attachments.length > 0 : false,
              }}
              isSelected={selectedThreadId === message.id}
              isFocused={selectedIndex === index}
              onClick={() => {
                void handleMessageSelect(message, index);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
