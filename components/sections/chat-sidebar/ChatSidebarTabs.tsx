"use client";

import { cn } from "@/lib/utils";

interface ChatSidebarTabsProps {
  showQueue: boolean;
  listTab: "queue" | "my";
  queueCount: number;
  myChatsCount: number;
  onTabChange: (tab: "queue" | "my") => void;
}

export function ChatSidebarTabs({
  showQueue,
  listTab,
  queueCount,
  myChatsCount,
  onTabChange,
}: ChatSidebarTabsProps) {
  return (
    <div
      className="flex shrink-0 border-b border-gray-100 bg-white xl:hidden"
      role="tablist"
      aria-label="Inbox lists"
    >
      {showQueue ? (
        <button
          type="button"
          role="tab"
          aria-selected={listTab === "queue"}
          onClick={() => onTabChange("queue")}
          className={cn(
            "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
            listTab === "queue"
              ? "border-brand-600 text-brand-700"
              : "cursor-pointer border-transparent text-gray-500 hover:text-gray-800",
          )}
        >
          Queue
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              listTab === "queue"
                ? "bg-brand-100 text-brand-700"
                : "bg-gray-200 text-gray-600",
            )}
          >
            {queueCount}
          </span>
        </button>
      ) : null}
      <button
        type="button"
        role="tab"
        aria-selected={listTab === "my"}
        onClick={() => onTabChange("my")}
        className={cn(
          "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
          listTab === "my"
            ? "border-brand-600 text-brand-700"
            : "cursor-pointer border-transparent text-gray-500 hover:text-gray-800",
        )}
      >
        My Chats
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            listTab === "my"
              ? "bg-brand-100 text-brand-700"
              : "bg-gray-200 text-gray-600",
          )}
        >
          {myChatsCount}
        </span>
      </button>
    </div>
  );
}
