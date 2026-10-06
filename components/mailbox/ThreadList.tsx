"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "./SearchBar";
import { ThreadListItem } from "./ThreadListItem";

interface ThreadListProps {
  folder: string;
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
}

export function ThreadList({
  folder,
  selectedThreadId,
  onThreadSelect,
  searchQuery,
  onSearchChange,
}: ThreadListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

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
  }, [folder]);

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

  const filteredMessages = searchQuery
    ? messages.filter(
        (msg) =>
          msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.fromAddress.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredMessages.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      onThreadSelect(filteredMessages[selectedIndex].id);
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
                snippet: getSnippet(message.bodyText, message.bodyHtml),
                timestamp: formatTimestamp(message.receivedAt),
                isUnread: false, // TODO: Add unread status from data
                isFlagged: false, // TODO: Add flag status from data
                hasAttachment: message.attachments ? message.attachments.length > 0 : false,
              }}
              isSelected={selectedThreadId === message.id}
              isFocused={selectedIndex === index}
              onClick={() => {
                onThreadSelect(message.id);
                setSelectedIndex(index);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
