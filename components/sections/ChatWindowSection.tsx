"use client";

import { FormEvent, useState } from "react";
import { FiInfo, FiMessageCircle } from "react-icons/fi";
import type { Chat, Message } from "../../lib/chat/types";
import { useAuth } from "../../hooks/useAuth";

interface Props {
  activeChat: Chat | null;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onResolveChat: () => void;
  onToggleCustomerInfo: () => void;
  showCustomerInfo: boolean;
}

export function ChatWindowSection({
  activeChat,
  messages,
  onSendMessage,
  onResolveChat,
  onToggleCustomerInfo,
  showCustomerInfo,
}: Props) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");

  const formatDayLabel = (date: Date) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
    );
    const startOfTarget = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const timePart = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (startOfTarget.getTime() === startOfToday.getTime()) {
      return `Today, ${timePart}`;
    }
    if (startOfTarget.getTime() === startOfYesterday.getTime()) {
      return `Yesterday, ${timePart}`;
    }

    const datePart = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${datePart}, ${timePart}`;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSendMessage(text);
    setDraft("");
  };

  if (!activeChat) {
    return (
      <section className="flex-1 flex flex-col h-full bg-white">
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc]">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4 shadow-sm">
            <FiMessageCircle className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="text-sm font-medium text-gray-700 mb-1">
            No chat selected
          </div>
          <div className="text-xs text-gray-400">
            Select or claim a chat from the sidebar to begin.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-sm">
            {activeChat.customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {activeChat.customer.name}
            </div>
            <div className="text-xs text-gray-500">Customer</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCustomerInfo}
            aria-label="Toggle customer info"
            className={
              "w-8 h-8 flex items-center justify-center rounded-full border transition-colors cursor-pointer " +
              (showCustomerInfo
                ? "border-brand-300 bg-brand-50 text-brand-600"
                : "border-gray-200 text-gray-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50")
            }
          >
            <FiInfo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onResolveChat}
            aria-label="Close chat"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc] flex flex-col gap-3">
        {[...messages]
          .slice()
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime(),
          )
          .map((message, index, arr) => {
            const isMine = message.senderId === user?.id;
            const isCustomer = message.senderRole === "customer";
            const avatarInitial = isCustomer
              ? activeChat.customer.name.charAt(0).toUpperCase()
              : activeChat.agent?.name.charAt(0).toUpperCase() ?? "A";
          const currentDate = new Date(message.createdAt);
          const prevMessage = index > 0 ? arr[index - 1] : null;
          const shouldShowDate =
            !prevMessage ||
            new Date(prevMessage.createdAt).toDateString() !==
              currentDate.toDateString();

            return (
            <div key={message.id}>
              {shouldShowDate && (
                <div className="flex items-center justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500">
                    {formatDayLabel(currentDate)}
                  </span>
                </div>
              )}
              <div
                className={`flex items-start gap-2 max-w-[80%] ${
                  isMine ? "self-end flex-row-reverse" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 mb-1">
                  {avatarInitial}
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    className={
                      "px-4 py-2.5 rounded-2xl shadow-sm text-sm " +
                      (isMine
                        ? "bg-brand-600 text-white"
                        : "bg-white border border-gray-100 text-gray-800")
                    }
                  >
                    {message.text}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
            );
          })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white border-t border-gray-200 shrink-0"
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl flex items-end overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
            <textarea
              rows={1}
              placeholder={
                activeChat ? "Type your message..." : "Select a chat to reply..."
              }
              className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-3 text-sm resize-none max-h-32 min-h-[44px] outline-none text-gray-700"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!activeChat}
            />
          </div>
          <button
            type="submit"
            disabled={!activeChat || !draft.trim()}
            className="w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ➤
          </button>
        </div>
      </form>
    </section>
  );
}

