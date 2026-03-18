"use client";

import Image from "next/image";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import type { Chat } from "../../lib/chat/types";

interface Props {
  queue: Chat[];
  myChats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onClaimChat: (chatId: string) => void;
}

const DEFAULT_CUSTOMER_AVATAR = "/assets/images/avatarCustomer.jpg";

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

function OnlineIndicator({ status }: { status?: string }) {
  const colorClass =
    status === "online"
      ? "bg-green-500"
      : status === "away"
        ? "bg-yellow-400"
        : "bg-gray-300";

  return (
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${colorClass} border-2 border-white rounded-full`}
    />
  );
}

export function ChatSidebarSection({
  queue,
  myChats,
  activeChatId,
  onSelectChat,
  onClaimChat,
}: Props) {
  const [queueSearch, setQueueSearch] = useState("");
  const [myChatsSearch, setMyChatsSearch] = useState("");

  const filteredQueue = queue.filter((chat) =>
    chat.customer.name.toLowerCase().includes(queueSearch.toLowerCase()),
  );

  const filteredMyChats = myChats.filter((chat) =>
    chat.customer.name.toLowerCase().includes(myChatsSearch.toLowerCase()),
  );

  return (
    <aside className="w-full md:w-[640px] lg:w-[720px] bg-white border-r border-gray-200 flex h-full">
      {/* Queue Column */}
      <div className="w-1/2 border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Queue</h3>
            <span className="bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs font-medium">
              {queue.length}
            </span>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search queue..."
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredQueue.map((chat) => {
            const timeLabel = chat.lastMessage
              ? formatTime(chat.lastMessage.createdAt)
              : formatTime(chat.createdAt);

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onClaimChat(chat.id)}
                className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent mb-1 transition-colors"
              >
                <div className="relative shrink-0">
                  <Image
                    src={chat.customer.avatar || DEFAULT_CUSTOMER_AVATAR}
                    alt={chat.customer.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <OnlineIndicator status={chat.customer.onlineStatus} />
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
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage?.text ?? "New conversation"}
                  </p>
                </div>
              </button>
            );
          })}

          {filteredQueue.length === 0 && (
            <div className="mt-8 text-center text-xs text-gray-400 px-2">
              {queueSearch
                ? "No matching chats found."
                : "No customers waiting in the queue."}
            </div>
          )}
        </div>
      </div>

      {/* My Chats Column */}
      <div className="w-1/2 flex flex-col h-full">
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">My Chats</h3>
            <span className="bg-brand-100 text-brand-600 py-0.5 px-2 rounded-full text-xs font-medium">
              {myChats.length}
            </span>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search my chats..."
              value={myChatsSearch}
              onChange={(e) => setMyChatsSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredMyChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const timeLabel = chat.lastMessage
              ? formatTime(chat.lastMessage.createdAt)
              : "";

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
                  <Image
                    src={chat.customer.avatar || DEFAULT_CUSTOMER_AVATAR}
                    alt={chat.customer.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <OnlineIndicator status={chat.customer.onlineStatus} />
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
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage?.text ?? ""}
                  </p>
                </div>
              </button>
            );
          })}

          {filteredMyChats.length === 0 && (
            <div className="mt-8 text-center text-xs text-gray-400 px-2">
              {myChatsSearch
                ? "No matching chats found."
                : "No active chats assigned to you yet."}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
