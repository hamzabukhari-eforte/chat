"use client";

import type { Chat } from "../../lib/chat/types";

interface Props {
  queue: Chat[];
  myChats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onClaimChat: (chatId: string) => void;
}

export function ChatSidebarSection({
  queue,
  myChats,
  activeChatId,
  onSelectChat,
  onClaimChat,
}: Props) {
  return (
    <aside className="w-full md:w-[420px] lg:w-[550px] bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Queue on the left, your chats on the right.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex gap-3 h-full">
          {/* Queue column */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Queue
              </span>
              <span className="ml-1 bg-gray-200 text-gray-600 py-0.5 px-1.5 rounded-full text-[10px]">
                {queue.length}
              </span>
            </div>

            <div className="space-y-1 overflow-y-auto pr-1">
              {queue.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => onClaimChat(chat.id)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent mb-1 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-xs">
                    {chat.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-xs font-medium text-gray-900 truncate">
                        {chat.customer.name}
                      </h4>
                      <span className="text-[10px] text-gray-400">Queued</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {chat.lastMessage?.text ?? ""}
                    </p>
                  </div>
                </button>
              ))}

              {queue.length === 0 && (
                <div className="mt-4 text-center text-[11px] text-gray-400 px-2">
                  No customers waiting in the queue.
                </div>
              )}
            </div>
          </div>

          <div className="w-px bg-gray-100 self-stretch" />

          {/* My chats column */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                My Chats
              </span>
              <span className="ml-1 bg-brand-100 text-brand-600 py-0.5 px-1.5 rounded-full text-[10px]">
                {myChats.length}
              </span>
            </div>

            <div className="space-y-1 overflow-y-auto pr-1">
              {myChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                const lastTime = chat.lastMessage
                  ? new Date(chat.lastMessage.createdAt).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )
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
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                      {chat.customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-semibold text-gray-900 truncate">
                          {chat.customer.name}
                        </h4>
                        {lastTime && (
                          <span className="text-[10px] text-gray-400">
                            {lastTime}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {chat.lastMessage?.text ?? ""}
                      </p>
                    </div>
                  </button>
                );
              })}

              {myChats.length === 0 && (
                <div className="mt-4 text-center text-[11px] text-gray-400 px-2">
                  No active chats assigned to you yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
