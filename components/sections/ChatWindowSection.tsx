"use client";

import Image from "next/image";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiInfo, FiSend, FiSmile, FiPaperclip, FiX, FiFile, FiMic } from "react-icons/fi";
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileCsv,
  FaFileAlt,
} from "react-icons/fa";
import { AvatarWithInitials } from "../atoms/AvatarWithInitials";
import { MessageSeenTicks } from "../atoms/MessageSeenTicks";
import { ChatAudioRecorder } from "../atoms/ChatAudioRecorder";
import { ChatVideoPlayer } from "../atoms/ChatVideoPlayer";
import { isVideoFile } from "../../lib/chat/fileAttachment";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { attachmentShouldRenderAsVideo } from "../../lib/chat/attachmentDisplay";
import { stableMessageListKey } from "../../lib/chat/messageKey";
import {
  formatChatDateSeparatorLabel,
  formatMessageTimeLabelFromMessage,
  messageGroupKeyFromHeader,
} from "../../lib/chat/sesMessageTime";
import type { Attachment, Chat, Message } from "../../lib/chat/types";

interface Props {
  activeChat: Chat | null;
  messages: Message[];
  onSendMessage: (
    text: string,
    attachments?: Attachment[],
    files?: File[],
  ) => void;
  onResolveChat: () => void;
  onToggleCustomerInfo: () => void;
  showCustomerInfo: boolean;
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const ACCEPTED_VIDEO_TYPES = "video/mp4,video/quicktime,video/webm";
const ACCEPTED_DOC_TYPES = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv";

interface FilePreview {
  id: string;
  file: File;
  type: "image" | "video" | "document" | "audio";
  previewUrl?: string;
}

/** Prefer `messageHeader` + local time from `createdAt`; fallback to `createdAt` for the pill. */
function dateSeparatorLabelFromMessage(message: Message): string {
  const h = message.messageHeader?.trim();
  const timeLabel = formatMessageTimeLabelFromMessage(message);
  if (h && timeLabel) return `${h}, ${timeLabel}`;
  if (h) return h;
  return formatChatDateSeparatorLabel(message.createdAt);
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

function getFileBaseName(fullName: string): string {
  const n = (fullName || "").trim();
  if (!n) return "";
  // Handles cases like `/recattachments/.../file.pdf`
  const parts = n.split(/[\\/]/);
  return parts[parts.length - 1] || n;
}

function getFileExtension(fullName: string): string {
  const base = getFileBaseName(fullName).toLowerCase();
  const m = /\.([a-z0-9]+)$/i.exec(base);
  return m?.[1] ?? "";
}

function getFileIcon(ext: string, className: string) {
  switch (ext) {
    case "pdf":
      return <FaFilePdf className={className} />;
    case "doc":
    case "docx":
    case "rtf":
      return <FaFileWord className={className} />;
    case "xls":
    case "xlsx":
    case "xlsm":
      return <FaFileExcel className={className} />;
    case "csv":
      return <FaFileCsv className={className} />;
    case "txt":
      // no dedicated txt icon; fallback to generic document
      return <FaFileAlt className={className} />;
    default:
      return <FaFileAlt className={className} />;
  }
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
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const messagesTailKey = useMemo(() => {
    if (!messages.length) return "";
    return stableMessageListKey(messages[messages.length - 1]);
  }, [messages]);

  useEffect(() => {
    if (!activeChat?.id) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    const run = () => {
      el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, [activeChat?.id, messages.length, messagesTailKey]);

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
      const isVideo = isVideoFile(file);
      const preview: FilePreview = {
        id: Math.random().toString(36).substring(7),
        file,
        type: isImage ? "image" : isVideo ? "video" : "document",
      };

      if (isImage || isVideo) {
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

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const handleVoiceRecordingComplete = async (blob: Blob) => {
    const url = await blobToDataUrl(blob);
    const id = Math.random().toString(36).slice(2);
    const name = `voice-message-${Date.now()}.webm`;
    const file = new File([blob], name, {
      type: blob.type || "audio/webm",
    });
    setFilePreviews((prev) => [
      ...prev,
      { id, file, type: "audio", previewUrl: url },
    ]);
  };

  const handleRecorderOpenChange = useCallback((recorderOpen: boolean) => {
    if (recorderOpen) setShowEmojiPicker(false);
  }, []);

  useEffect(() => {
    if (!imagePreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImagePreview(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imagePreview]);

  const downloadAttachment = (att: Attachment) => {
    if (!att.url) return;
    const link = document.createElement("a");
    link.href = att.url;
    link.download = att.name || "download";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
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

    const files = filePreviews.map((fp) => fp.file);
    onSendMessage(
      text,
      attachments.length > 0 ? attachments : undefined,
      files.length > 0 ? files : undefined,
    );
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

  const customerName = activeChat.customer.name;
  const agentName = activeChat.agent?.name ?? "Agent";

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <AvatarWithInitials
            name={customerName}
            src={activeChat.customer.avatar}
            size={40}
            alt={customerName}
          />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {customerName}
            </h3>
            {/* <p className="text-xs text-gray-500">
              {getOnlineStatusText(activeChat.customer.onlineStatus)}
            </p> */}
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
      <div
        ref={messagesScrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6"
      >
        {sortedMessages.map((message, index, arr) => {
          const isAgent = message.senderRole === "agent";
          const prevMessage = index > 0 ? arr[index - 1] : null;
          const groupKey = messageGroupKeyFromHeader(
            message.messageHeader,
            message.createdAt,
          );
          const prevGroupKey = prevMessage
            ? messageGroupKeyFromHeader(
                prevMessage.messageHeader,
                prevMessage.createdAt,
              )
            : null;
          const shouldShowDate =
            !prevMessage || groupKey !== prevGroupKey;

          const timeStr = formatMessageTimeLabelFromMessage(message);

          const datePillLabel = dateSeparatorLabelFromMessage(message);
          return (
            <div key={stableMessageListKey(message)}>
              {shouldShowDate && datePillLabel && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500 font-medium">
                    {datePillLabel}
                  </span>
                </div>
              )}

              {isAgent ? (
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 flex flex-col items-end">
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 justify-end">
                        {message.attachments.map((att) => (
                          <div key={att.id} className="relative shrink-0">
                            {attachmentShouldRenderAsVideo(att) && att.url ? (
                              <ChatVideoPlayer url={att.url} maxWidth={280} />
                            ) : att.type === "image" && att.url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setImagePreview({
                                    url: att.url,
                                    name: att.name,
                                  })
                                }
                                aria-label={`Preview image: ${att.name}`}
                                className="cursor-pointer"
                              >
                                <Image
                                  src={att.url}
                                  alt={att.name}
                                  width={200}
                                  height={150}
                                  unoptimized
                                  className="rounded-lg object-cover max-w-[200px] max-h-[150px] hover:opacity-90 transition-opacity"
                                />
                              </button>
                            ) : att.type === "audio" && att.url ? (
                              <audio
                                src={att.url}
                                controls
                                className="max-w-[220px] rounded-lg"
                                preload="metadata"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => downloadAttachment(att)}
                                disabled={!att.url}
                                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <div className="w-8 h-8 rounded-md bg-gray-300 flex items-center justify-center shrink-0">
                                  {getFileIcon(
                                    getFileExtension(att.name),
                                    "w-5 h-5 text-gray-700",
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className="text-sm font-medium truncate max-w-[180px]"
                                    title={att.name}
                                  >
                                    {getFileBaseName(att.name)}
                                  </span>
                                  {getFileExtension(att.name) && (
                                    <span className="text-[10px] text-gray-500 uppercase leading-3">
                                      {getFileExtension(att.name)}
                                    </span>
                                  )}
                                </div>
                              </button>
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
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-gray-400">{timeStr}</span>
                      <MessageSeenTicks status={message.chatSeenStatus} />
                    </div>
                  </div>
                  <AvatarWithInitials
                    name={agentName}
                    src={activeChat.agent?.avatar}
                    size={32}
                    alt={agentName}
                  />
                </div>
              ) : (
                <div className="flex gap-3">
                  <AvatarWithInitials
                    name={customerName}
                    src={activeChat.customer.avatar}
                    size={32}
                    alt={customerName}
                  />
                  <div className="flex-1">
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.attachments.map((att) => (
                          <div key={att.id} className="relative shrink-0">
                            {attachmentShouldRenderAsVideo(att) && att.url ? (
                              <ChatVideoPlayer url={att.url} maxWidth={280} />
                            ) : att.type === "image" && att.url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setImagePreview({
                                    url: att.url,
                                    name: att.name,
                                  })
                                }
                                aria-label={`Preview image: ${att.name}`}
                                className="cursor-pointer"
                              >
                                <Image
                                  src={att.url}
                                  alt={att.name}
                                  width={200}
                                  height={150}
                                  unoptimized
                                  className="rounded-lg object-cover max-w-[200px] max-h-[150px] hover:opacity-90 transition-opacity"
                                />
                              </button>
                            ) : att.type === "audio" && att.url ? (
                              <audio
                                src={att.url}
                                controls
                                className="max-w-[220px] rounded-lg"
                                preload="metadata"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => downloadAttachment(att)}
                                disabled={!att.url}
                                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <div className="w-8 h-8 rounded-md bg-gray-300 flex items-center justify-center shrink-0">
                                  {getFileIcon(
                                    getFileExtension(att.name),
                                    "w-5 h-5 text-gray-700",
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className="text-sm font-medium truncate max-w-[180px]"
                                    title={att.name}
                                  >
                                    {getFileBaseName(att.name)}
                                  </span>
                                  {getFileExtension(att.name) && (
                                    <span className="text-[10px] text-gray-500 uppercase leading-3">
                                      {getFileExtension(att.name)}
                                    </span>
                                  )}
                                </div>
                              </button>
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

      {/* Image preview overlay */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setImagePreview(null);
          }}
        >
          <div className="relative w-[40vw] h-[60vh] max-h-[700px] rounded-lg overflow-hidden bg-black">
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center cursor-pointer transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Close image preview"
            >
              <FiX className="w-4 h-4 text-gray-700" />
            </button>

            <Image
              src={imagePreview.url}
              alt={imagePreview.name}
              fill
              unoptimized
              sizes="90vw"
              className="object-contain"
            />

            {imagePreview.name && (
              <div className="mt-3 text-center">
                <p className="text-sm text-white/90 truncate max-w-[90vw]">
                  {imagePreview.name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Previews */}
      {filePreviews.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {filePreviews.map((fp) => (
              <div
                key={fp.id}
                className="relative group bg-white border border-gray-200 rounded-lg p-2 flex items-center gap-2"
              >
                {fp.type === "audio" && fp.previewUrl ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                      <FiMic className="w-5 h-5 text-brand-600" />
                    </div>
                    <audio
                      src={fp.previewUrl}
                      controls
                      className="h-8 w-[120px] max-w-[120px]"
                      preload="metadata"
                    />
                  </div>
                ) : fp.type === "image" && fp.previewUrl ? (
                  <Image
                    src={fp.previewUrl}
                    alt={fp.file.name}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : fp.type === "video" && fp.previewUrl ? (
                  <div className="w-[100px] shrink-0">
                    <ChatVideoPlayer url={fp.previewUrl} maxWidth={100} />
                  </div>
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
                accept={`${ACCEPTED_IMAGE_TYPES},${ACCEPTED_VIDEO_TYPES},${ACCEPTED_DOC_TYPES}`}
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

              <ChatAudioRecorder
                onRecordingComplete={handleVoiceRecordingComplete}
                onOpenChange={handleRecorderOpenChange}
              />

              {/* Emoji Picker Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={
                    "py-3 px-1.5 transition-colors cursor-pointer relative z-10 " +
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
