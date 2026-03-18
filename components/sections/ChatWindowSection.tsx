"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { FiInfo, FiSend, FiSmile, FiPaperclip, FiX, FiFile } from "react-icons/fi";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { Chat, Message, Attachment } from "../../lib/chat/types";

interface Props {
  activeChat: Chat | null;
  messages: Message[];
  onSendMessage: (text: string, attachments?: Attachment[]) => void;
  onResolveChat: () => void;
  onToggleCustomerInfo: () => void;
  showCustomerInfo: boolean;
}

const DEFAULT_CUSTOMER_AVATAR = "/assets/images/avatarCustomer.jpg";
const DEFAULT_AGENT_AVATAR = "/assets/images/avatarAgent.jpg";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const ACCEPTED_DOC_TYPES = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv";

interface FilePreview {
  id: string;
  file: File;
  type: "image" | "document";
  previewUrl?: string;
}

function formatDayLabel(date: Date): string {
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
}

function getOnlineStatusText(status?: string): string {
  if (status === "online") return "Online";
  if (status === "away") return "Away";
  return "Offline";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ChatWindowSection({
  activeChat,
  messages,
  onSendMessage,
  onResolveChat,
  onToggleCustomerInfo,
  showCustomerInfo,
}: Props) {
  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiSelect = (emoji: { native: string }) => {
    setDraft((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPreviews: FilePreview[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const preview: FilePreview = {
        id: Math.random().toString(36).substring(7),
        file,
        type: isImage ? "image" : "document",
      };

      if (isImage) {
        preview.previewUrl = await fileToBase64(file);
      }

      newPreviews.push(preview);
    }

    setFilePreviews((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFilePreview = (id: string) => {
    setFilePreviews((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text && filePreviews.length === 0) return;

    const attachments: Attachment[] = filePreviews.map((fp) => ({
      id: fp.id,
      type: fp.type,
      name: fp.file.name,
      url: fp.previewUrl || "",
      size: fp.file.size,
      mimeType: fp.file.type,
    }));

    onSendMessage(text, attachments.length > 0 ? attachments : undefined);
    setDraft("");
    setFilePreviews([]);
    setShowEmojiPicker(false);
  };

  if (!activeChat) {
    return (
      <section className="flex-1 flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <HiOutlineChatBubbleLeftRight className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              Select a chat to start messaging
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Choose from the queue or your active chats
            </p>
          </div>
        </div>
      </section>
    );
  }

  const customerAvatar = activeChat.customer.avatar || DEFAULT_CUSTOMER_AVATAR;
  const agentAvatar = activeChat.agent?.avatar || DEFAULT_AGENT_AVATAR;

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Image
            src={customerAvatar}
            alt={activeChat.customer.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {activeChat.customer.name}
            </h3>
            <p className="text-xs text-gray-500">
              {getOnlineStatusText(activeChat.customer.onlineStatus)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCustomerInfo}
            aria-label="Toggle customer info"
            className={
              "w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer " +
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
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
          >
            Close Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {sortedMessages.map((message, index, arr) => {
          const isAgent = message.senderRole === "agent";
          const currentDate = new Date(message.createdAt);
          const prevMessage = index > 0 ? arr[index - 1] : null;
          const shouldShowDate =
            !prevMessage ||
            new Date(prevMessage.createdAt).toDateString() !==
              currentDate.toDateString();

          const avatar = isAgent ? agentAvatar : customerAvatar;
          const timeStr = currentDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={message.id}>
              {shouldShowDate && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500 font-medium">
                    {formatDayLabel(currentDate)}
                  </span>
                </div>
              )}

              {isAgent ? (
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 flex flex-col items-end">
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 justify-end">
                        {message.attachments.map((att) => (
                          <div key={att.id} className="relative">
                            {att.type === "image" && att.url ? (
                              <Image
                                src={att.url}
                                alt={att.name}
                                width={200}
                                height={150}
                                unoptimized
                                className="rounded-lg object-cover max-w-[200px] max-h-[150px]"
                              />
                            ) : (
                              <div className="flex items-center gap-2 bg-brand-400 text-white px-3 py-2 rounded-lg">
                                <FiFile className="w-4 h-4" />
                                <span className="text-sm truncate max-w-[150px]">
                                  {att.name}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {message.text && (
                      <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 inline-block max-w-md">
                        <p className="text-sm">{message.text}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-400">{timeStr}</span>
                    </div>
                  </div>
                  <Image
                    src={avatar}
                    alt="Agent"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                </div>
              ) : (
                <div className="flex gap-3">
                  <Image
                    src={avatar}
                    alt={activeChat.customer.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1">
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.attachments.map((att) => (
                          <div key={att.id} className="relative">
                            {att.type === "image" && att.url ? (
                              <Image
                                src={att.url}
                                alt={att.name}
                                width={200}
                                height={150}
                                unoptimized
                                className="rounded-lg object-cover max-w-[200px] max-h-[150px]"
                              />
                            ) : (
                              <div className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg">
                                <FiFile className="w-4 h-4" />
                                <span className="text-sm truncate max-w-[150px]">
                                  {att.name}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {message.text && (
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 inline-block max-w-md">
                        <p className="text-sm text-gray-800">{message.text}</p>
                      </div>
                    )}
                    <span className="text-xs text-gray-400 mt-1 block">
                      {timeStr}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* File Previews */}
      {filePreviews.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {filePreviews.map((fp) => (
              <div
                key={fp.id}
                className="relative group bg-white border border-gray-200 rounded-lg p-2 flex items-center gap-2"
              >
                {fp.type === "image" && fp.previewUrl ? (
                  <Image
                    src={fp.previewUrl}
                    alt={fp.file.name}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                    <FiFile className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                    {fp.file.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatFileSize(fp.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFilePreview(fp.id)}
                  className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2">
            {/* Input Container */}
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl flex items-center focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={`${ACCEPTED_IMAGE_TYPES},${ACCEPTED_DOC_TYPES}`}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer"
                title="Attach file"
              >
                <FiPaperclip className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <textarea
                rows={1}
                placeholder="Type your message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setShowEmojiPicker(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 py-3 text-sm resize-none max-h-32 min-h-[44px] outline-none text-gray-700"
              />

              {/* Emoji Picker Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={
                    "p-3 transition-colors cursor-pointer relative z-10 " +
                    (showEmojiPicker
                      ? "text-brand-500"
                      : "text-gray-400 hover:text-gray-600")
                  }
                  title="Add emoji"
                >
                  <FiSmile className="w-5 h-5" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-12 right-0 z-50 shadow-lg rounded-lg"
                  >
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="light"
                      previewPosition="none"
                      skinTonePosition="none"
                      maxFrequentRows={2}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!draft.trim() && filePreviews.length === 0}
              className="w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
