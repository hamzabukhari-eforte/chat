"use client";

import { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiSearch } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { sortChatsByLatestFirst } from "../../lib/chat/chatSort";
import { AvatarWithInitials } from "../atoms/AvatarWithInitials";
import type { Chat, User } from "../../lib/chat/types";
import { ChatSidebarTabs } from "./chat-sidebar/ChatSidebarTabs";
import { ChatListColumn } from "./chat-sidebar/ChatListColumn";

interface Props {
  queue: Chat[];
  myChats: Chat[];
  isInitialLoading?: boolean;
  showQueue: boolean;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onClaimChat: (chatId: string) => void;
  /** Below `xl`, show a row to return to the conversation when the inbox is visible. */
  showResumeOpenChat?: boolean;
  resumeChatCustomerName?: string;
  onResumeOpenChat?: () => void;
}

function unreadBadgeLabel(n: number): string {
  if (n <= 0) return "";
  if (n > 99) return "99+";
  return String(n);
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function customerSearchHaystack(customer: User): string {
  const parts = [
    customer.name,
    customer.email,
    customer.phone,
    customer.city,
    customer.country,
    customer.region,
  ];
  return parts
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v).toLowerCase())
    .join(" ");
}

/** Match if every whitespace-separated term appears somewhere in name, email, phone, city, country, or region. */
function chatMatchesCustomerSearch(chat: Chat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = customerSearchHaystack(chat.customer);
  const terms = q.split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

/** Green when the chat session is active (`isChatActive` from API); gray otherwise. */
function ChatActiveDot({ isChatActive }: { isChatActive?: boolean }) {
  const colorClass = isChatActive === true ? "bg-green-400" : "bg-gray-300";
  return (
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${colorClass} border-2 border-white rounded-full`}
    />
  );
}

export function ChatSidebarSection({
  queue,
  myChats,
  isInitialLoading = false,
  showQueue,
  activeChatId,
  onSelectChat,
  onClaimChat,
  showResumeOpenChat = false,
  resumeChatCustomerName = "",
  onResumeOpenChat,
}: Props) {
  const [queueSearch, setQueueSearch] = useState("");
  const [myChatsSearch, setMyChatsSearch] = useState("");
  const [listTab, setListTab] = useState<"queue" | "my">(
    showQueue ? "queue" : "my",
  );

  useEffect(() => {
    if (!showQueue && listTab === "queue") {
      setListTab("my");
    }
  }, [showQueue, listTab]);

  const sortedQueue = useMemo(() => {
    const filtered = queue.filter((chat) =>
      chatMatchesCustomerSearch(chat, queueSearch),
    );
    return sortChatsByLatestFirst(filtered);
  }, [queue, queueSearch]);

  const sortedMyChats = useMemo(() => {
    const filtered = myChats.filter((chat) =>
      chatMatchesCustomerSearch(chat, myChatsSearch),
    );
    return sortChatsByLatestFirst(filtered);
  }, [myChats, myChatsSearch]);

  if (isInitialLoading) {
    const SidebarListSkeleton = ({ title }: { title: string }) => (
      <div className="flex min-h-0 flex-1 flex-col border-gray-200 xl:w-2xs xl:first:border-r">
        <div className="shrink-0 border-b border-gray-100 p-3 sm:p-4">
          <div className="mb-3 hidden items-center justify-between xl:flex">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
          </div>
          <div className="relative">
            <div className="h-9 w-full animate-pulse rounded-md border border-gray-200 bg-gray-50" />
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`${title}-skeleton-row-${index}`}
              className="flex items-start gap-3 rounded-lg border border-transparent p-3"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-2.5 w-10 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <aside
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col border-b border-gray-200 bg-white",
          "max-xl:flex-1 max-xl:min-h-0",
          showQueue
            ? "xl:h-full xl:w-[min(100%,40rem)] xl:min-w-0 xl:flex-row xl:border-b-0 xl:border-r xl:border-gray-200 2xl:w-[min(100%,40rem)]"
            : "xl:h-full xl:w-[min(100%,420px)] xl:min-w-0 xl:flex-row xl:border-b-0 xl:border-r xl:border-gray-200 2xl:w-[min(100%,420px)]",
        )}
      >
        <div className="flex shrink-0 border-b border-gray-100 bg-white xl:hidden">
          <div className="flex min-h-11 flex-1 items-center justify-center border-b-2 border-transparent px-3">
            <div className="h-3 w-14 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
          {showQueue ? <SidebarListSkeleton title="queue" /> : null}
          <SidebarListSkeleton title="my" />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full shrink-0 flex-col border-b border-gray-200 bg-white",
        "max-xl:flex-1 max-xl:min-h-0",
        showQueue
          ? "xl:h-full xl:w-[min(100%,40rem)] xl:min-w-0 xl:flex-row xl:border-b-0 xl:border-r xl:border-gray-200 2xl:w-180"
          : "xl:h-full xl:w-[min(100%,420px)] xl:min-w-0 xl:flex-row xl:border-b-0 xl:border-r xl:border-gray-200 2xl:w-[400px]",
      )}
    >
      <ChatSidebarTabs
        showQueue={showQueue}
        listTab={listTab}
        queueCount={queue.length}
        myChatsCount={myChats.length}
        onTabChange={setListTab}
      />

      {showResumeOpenChat &&
      onResumeOpenChat &&
      resumeChatCustomerName.trim() !== "" ? (
        <div className="shrink-0 border-b border-brand-100 bg-brand-50/90 px-3 py-2 xl:hidden">
          <button
            type="button"
            onClick={onResumeOpenChat}
            className="w-full flex gap-2 items-center justify-between cursor-pointer rounded-lg border border-gray-400 bg-white px-3 py-2 text-left text-sm font-medium text-brand-800 transition-colors hover:bg-brand-50"
          >
            <span>
              Continue chat with{" "}
              <span className="font-semibold">{resumeChatCustomerName}</span>
            </span>
            <span>
              <FiArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
        {/* Queue Column */}
        {showQueue ? (
          <ChatListColumn
            title="Queue"
            titleCount={queue.length}
            titleCountClassName="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
            isVisible={listTab === "queue"}
            className="flex min-h-0 flex-col border-gray-200 xl:w-1/2 xl:border-r max-w-[400px]"
            searchValue={queueSearch}
            onSearchChange={setQueueSearch}
            chats={sortedQueue}
            emptyText="No customers waiting in the queue."
            searchEmptyText="No matching chats found."
            onRowClick={onClaimChat}
            rowClassName={(chat) =>
              `w-full text-left flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent mb-1 transition-colors ${chat.lastAssignedAgent && chat.lastChatTime ? "items-center" : "items-start"}`
            }
            timeLabel={(chat) =>
              chat.messageTimeDisplay ??
              (chat.lastMessage
                ? formatTime(chat.lastMessage.createdAt)
                : formatTime(chat.createdAt))
            }
            renderRowMeta={(chat) =>
              chat.lastAssignedAgent && chat.lastChatTime ? (
                <div>
                  <p className="text-[10px] text-gray-600 truncate">
                    Last assigned to:{" "}
                    <span className="font-medium text-gray-700">
                      {" "}
                      {chat.lastAssignedAgent ?? ""}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-600 truncate">
                    Last chat time:{" "}
                    <span className="font-medium text-gray-700">
                      {" "}
                      {chat.lastChatTime}
                    </span>
                  </p>
                </div>
              ) : null
            }
          />
        ) : null}

        {/* My Chats Column */}
        <ChatListColumn
          title="My Chats"
          titleCount={myChats.length}
          titleCountClassName="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600"
          isVisible={listTab === "my"}
          className={cn(
            "flex min-h-0 flex-col border-gray-200 max-w-[400px]",
            showQueue ? "xl:w-1/2" : "xl:w-full",
          )}
          searchValue={myChatsSearch}
          onSearchChange={setMyChatsSearch}
          chats={sortedMyChats}
          emptyText="No active chats assigned to you yet."
          searchEmptyText="No matching chats found."
          onRowClick={onSelectChat}
          rowClassName={(chat) =>
            "w-full text-left flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-colors border " +
            (chat.id === activeChatId
              ? "bg-brand-50 border-brand-100"
              : "hover:bg-gray-50 border-transparent")
          }
          timeLabel={(chat) =>
            chat.messageTimeDisplay ??
            (chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : "")
          }
          renderRowMeta={(chat) => {
            const unread = chat.counts ?? 0;
            return chat.customer.phone?.trim() || unread > 0 ? (
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-[10px] text-gray-500">
                  {chat.customer.phone?.trim() ?? ""}
                </p>
                {unread > 0 ? (
                  <span
                    className="flex min-h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-semibold leading-none text-white"
                    aria-label={`${unread} unread messages`}
                  >
                    {unreadBadgeLabel(unread)}
                  </span>
                ) : null}
              </div>
            ) : null;
          }}
        />
      </div>
    </aside>
  );
}
