"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppRail } from "./AppRail";
import { FolderSidebar } from "./FolderSidebar";
import { ThreadList } from "./ThreadList";
import { ReadingPane } from "./ReadingPane";
import { ComposePanel } from "./ComposePanel";

interface AppShellProps {
  userRole?: "USER" | "ADMIN";
  userEmail?: string;
  userDisplayName?: string;
  defaultFolder?: "INBOX" | "SENT" | "DRAFTS" | "TRASH";
  theme?: "DARK" | "LIGHT";
  density?: "COMFORTABLE" | "COMPACT";
  folderCounts?: Record<string, number>;
}

export function AppShell({
  userRole = "USER",
  userEmail,
  userDisplayName,
  defaultFolder = "INBOX",
  theme = "DARK",
  density = "COMFORTABLE",
  folderCounts,
}: AppShellProps) {
  const router = useRouter();
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(folderCounts?.INBOX ?? 0);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFolderDrawerOpen, setIsFolderDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<"mail" | "rules" | "admin" | "settings">("mail");

  useEffect(() => {
    setInboxUnreadCount(folderCounts?.INBOX ?? 0);
  }, [folderCounts?.INBOX]);

  // Handle navigation
  useEffect(() => {
    if (activeNav === "rules") {
      window.location.href = "/rules";
    } else if (activeNav === "admin") {
      window.location.href = "/admin";
    } else if (activeNav === "settings") {
      window.location.href = "/settings";
    }
  }, [activeNav]);

  return (
    <div className={`mailbox-shell theme-${theme.toLowerCase()} density-${density.toLowerCase()}`}>
      {isFolderDrawerOpen && (
        <button
          className="mobile-folder-backdrop"
          aria-label="Close folders"
          onClick={() => setIsFolderDrawerOpen(false)}
        />
      )}
      <AppRail
        activeNav={activeNav}
        onNavChange={setActiveNav}
        userRole={userRole}
        userEmail={userEmail}
        userDisplayName={userDisplayName}
      />
      <FolderSidebar
        selectedFolder={selectedFolder}
        onFolderSelect={(folder) => {
          setSelectedFolder(folder);
          setIsFolderDrawerOpen(false);
        }}
        onCompose={() => {
          setReplyToMessageId(null);
          setIsComposeOpen(true);
        }}
        folderCounts={{ INBOX: inboxUnreadCount }}
        isDrawerOpen={isFolderDrawerOpen}
      />
      <ThreadList
        folder={selectedFolder}
        selectedThreadId={selectedThreadId}
        onThreadSelect={setSelectedThreadId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        refreshKey={refreshKey}
        onRefresh={() => {
          setRefreshKey((key) => key + 1);
          router.refresh();
        }}
        onMessageRead={() => setInboxUnreadCount((count) => Math.max(0, count - 1))}
        onFoldersToggle={() => setIsFolderDrawerOpen((open) => !open)}
      />
      <ReadingPane
        threadId={selectedThreadId}
        onReply={() => {
          setReplyToMessageId(selectedThreadId);
          setIsComposeOpen(true);
        }}
        onBack={() => setSelectedThreadId(null)}
      />
      {isComposeOpen && (
        <ComposePanel
          isOpen={isComposeOpen}
          isMinimized={isComposeMinimized}
          onClose={() => {
            setIsComposeOpen(false);
            setReplyToMessageId(null);
          }}
          onToggleMinimize={() => setIsComposeMinimized(!isComposeMinimized)}
          replyToMessageId={replyToMessageId}
        />
      )}
    </div>
  );
}
