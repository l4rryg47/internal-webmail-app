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
  folderCounts?: Record<string, number>;
}

export function AppShell({ userRole = "USER", userEmail, folderCounts }: AppShellProps) {
  const router = useRouter();
  const [selectedFolder, setSelectedFolder] = useState<string>("INBOX");
  const [inboxUnreadCount, setInboxUnreadCount] = useState(folderCounts?.INBOX ?? 0);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeNav, setActiveNav] = useState<"mail" | "rules" | "admin">("mail");

  useEffect(() => {
    setInboxUnreadCount(folderCounts?.INBOX ?? 0);
  }, [folderCounts?.INBOX]);

  // Handle navigation
  useEffect(() => {
    if (activeNav === "rules") {
      window.location.href = "/rules";
    } else if (activeNav === "admin") {
      window.location.href = "/admin";
    }
  }, [activeNav]);

  return (
    <div className="mailbox-shell">
      <AppRail
        activeNav={activeNav}
        onNavChange={setActiveNav}
        userRole={userRole}
        userEmail={userEmail}
      />
      <FolderSidebar
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        onCompose={() => setIsComposeOpen(true)}
        folderCounts={{ INBOX: inboxUnreadCount }}
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
      />
      <ReadingPane
        threadId={selectedThreadId}
        onReply={() => setIsComposeOpen(true)}
      />
      {isComposeOpen && (
        <ComposePanel
          isOpen={isComposeOpen}
          isMinimized={isComposeMinimized}
          onClose={() => setIsComposeOpen(false)}
          onToggleMinimize={() => setIsComposeMinimized(!isComposeMinimized)}
          replyToThreadId={selectedThreadId}
        />
      )}
    </div>
  );
}
