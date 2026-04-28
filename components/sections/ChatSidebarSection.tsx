"use client";

import { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiSearch } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { sortChatsByLatestFirst } from "../../lib/chat/chatSort";
import { AvatarWithInitials } from "../atoms/AvatarWithInitials";
import type { Chat, User } from "../../lib/chat/types";

interface Props {
  queue: Chat[];
  myChats: Chat[];
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

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full shrink-0 flex-col border-b border-gray-200 bg-white",
        "max-xl:flex-1 max-xl:min-h-0",
        "xl:h-full xl:w-[min(100%,40rem)] xl:min-w-0 xl:flex-row xl:border-b-0 xl:border-r xl:border-gray-200 2xl:w-180",
      )}
    >
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
            onClick={() => setListTab("queue")}
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
              {queue.length}
            </span>
          </button>
        ) : null}
        <button
          type="button"
          role="tab"
          aria-selected={listTab === "my"}
          onClick={() => setListTab("my")}
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
            {myChats.length}
          </span>
        </button>
      </div>

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
            <span><FiArrowRight className="w-4 h-4" /></span>
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
      {/* Queue Column */}
      {showQueue ? (
        <div
          className={cn(
            "flex min-h-0 flex-col border-gray-200 xl:w-1/2 xl:border-r",
            listTab === "queue" ? "flex flex-1 xl:flex-none" : "hidden xl:flex",
          )}
        >
        <div className="shrink-0 border-b border-gray-100 p-3 sm:p-4">
          <div className="mb-3 hidden items-center justify-between xl:flex">
            <h3 className="text-sm font-semibold text-gray-700">Queue</h3>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
              {queue.length}
            </span>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search by name, email, phone…"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sortedQueue.map((chat) => {
            const timeLabel =
              chat.messageTimeDisplay ??
              (chat.lastMessage
                ? formatTime(chat.lastMessage.createdAt)
                : formatTime(chat.createdAt));

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onClaimChat(chat.id)}
                className={`w-full text-left flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent mb-1 transition-colors ${chat.lastAssignedAgent && chat.lastChatTime ? "items-center" : "items-start"}`}
              >
                <div className="relative shrink-0">
                  <AvatarWithInitials
                    name={chat.customer.name}
                    src={chat.customer.avatar}
                    size={40}
                  />
                  {/* <ChatActiveDot isChatActive={chat.isChatActive} /> */}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {chat.customer.name}
                    </h4>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {timeLabel}
                    </span>
                  </div>
                  {chat.lastAssignedAgent && chat.lastChatTime && <div>
                    <p className="text-[10px] text-gray-600 truncate">
                      Last assigned to: <span className="font-medium text-gray-700"> {chat.lastAssignedAgent ?? ""}</span>
                    </p>
                    <p className="text-[10px] text-gray-600 truncate">
                      Last chat time: <span className="font-medium text-gray-700"> {chat.lastChatTime}</span>
                    </p>
                  </div>
                  } </div>

              </button>
            );
          })}

          {sortedQueue.length === 0 && (
            <div className="mt-8 text-center text-xs text-gray-400 px-2">
              {queueSearch
                ? "No matching chats found."
                : "No customers waiting in the queue."}
            </div>
          )}
        </div>
        </div>
      ) : null}

      {/* My Chats Column */}
      <div
        className={cn(
          "flex min-h-0 flex-col border-gray-200",
          showQueue ? "xl:w-1/2" : "xl:w-full",
          listTab === "my" ? "flex flex-1 xl:flex-none" : "hidden xl:flex",
        )}
      >
        <div className="shrink-0 border-b border-gray-100 p-3 sm:p-4">
          <div className="mb-3 hidden items-center justify-between xl:flex">
            <h3 className="text-sm font-semibold text-gray-700">My Chats</h3>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600">
              {myChats.length}
            </span>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search by name, email, phone…"
              value={myChatsSearch}
              onChange={(e) => setMyChatsSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sortedMyChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const timeLabel =
              chat.messageTimeDisplay ??
              (chat.lastMessage
                ? formatTime(chat.lastMessage.createdAt)
                : "");
            const unread = chat.counts ?? 0;

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelectChat(chat.id)}
                className={
                  "w-full text-left flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-colors border " +
                  (isActive
                    ? "bg-brand-50 border-brand-100"
                    : "hover:bg-gray-50 border-transparent")
                }
              >
                <div className="relative shrink-0">
                  <AvatarWithInitials
                    name={chat.customer.name}
                    src={chat.customer.avatar}
                    size={40}
                  />
                  {/* <ChatActiveDot isChatActive={chat.isChatActive} /> */}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {chat.customer.name}
                    </h4>
                    {timeLabel && (
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {timeLabel}
                      </span>
                    )}
                  </div>
                  {(chat.customer.phone?.trim() || unread > 0) ? (
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
                  ) : null}
                </div>
              </button>
            );
          })}

          {sortedMyChats.length === 0 && (
            <div className="mt-8 text-center text-xs text-gray-400 px-2">
              {myChatsSearch
                ? "No matching chats found."
                : "No active chats assigned to you yet."}
            </div>
          )}
        </div>
      </div>
      </div>
    </aside>
  );
}
