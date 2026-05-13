"use client";

import { FiSearch } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { AvatarWithInitials } from "@/components/atoms/AvatarWithInitials";
import type { Chat } from "@/lib/chat/types";

interface ChatListColumnProps {
  title: string;
  titleCount: number;
  titleCountClassName: string;
  isVisible: boolean;
  className: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  chats: Chat[];
  emptyText: string;
  searchEmptyText: string;
  onRowClick: (chatId: string) => void;
  rowClassName: (chat: Chat) => string;
  timeLabel: (chat: Chat) => string;
  renderRowMeta: (chat: Chat) => React.ReactNode;
}

export function ChatListColumn({
  title,
  titleCount,
  titleCountClassName,
  isVisible,
  className,
  searchValue,
  onSearchChange,
  chats,
  emptyText,
  searchEmptyText,
  onRowClick,
  rowClassName,
  timeLabel,
  renderRowMeta,
}: ChatListColumnProps) {
  return (
    <div
      className={cn(
        className,
        isVisible ? "flex flex-1 xl:flex-none" : "hidden xl:flex",
      )}
    >
      <div className="shrink-0 border-b border-gray-100 p-3 sm:p-4">
        <div className="mb-3 hidden items-center justify-between xl:flex">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <span className={titleCountClassName}>{titleCount}</span>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search by name, email, phone…"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {chats.map((chat) => (
          <button
            key={chat.id}
            type="button"
            onClick={() => onRowClick(chat.id)}
            className={rowClassName(chat)}
          >
            <div className="relative shrink-0">
              <AvatarWithInitials
                name={chat.customer.name}
                src={chat.customer.avatar}
                size={40}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {chat.customer.name}
                </h4>
                {timeLabel(chat) ? (
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {timeLabel(chat)}
                  </span>
                ) : null}
              </div>
              {renderRowMeta(chat)}
            </div>
          </button>
        ))}

        {chats.length === 0 && (
          <div className="mt-8 text-center text-xs text-gray-400 px-2">
            {searchValue ? searchEmptyText : emptyText}
          </div>
        )}
      </div>
    </div>
  );
}
