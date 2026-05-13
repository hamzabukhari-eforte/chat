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
import { FiFile, FiMic, FiPaperclip, FiSend, FiSmile, FiX } from "react-icons/fi";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useAutoGrowTextarea } from "../../hooks/useAutoGrowTextarea";
import { useWebSocketChat } from "../../hooks/useWebSocketChat";
import { toast } from "sonner";
import { attachmentShouldRenderAsVideo } from "../../lib/chat/attachmentDisplay";
import { stableMessageListKey } from "../../lib/chat/messageKey";
import { formatMessageTimeLabelFromMessage } from "../../lib/chat/sesMessageTime";
import type { Attachment, Message, User } from "../../lib/chat/types";
import type { ComposerFilePreview } from "../../lib/chat/composerAttachments";
import { ExpandableMessageText } from "../atoms/ExpandableMessageText";
import { ChatAudioRecorder } from "../atoms/ChatAudioRecorder";
import { ChatVideoPlayer } from "../atoms/ChatVideoPlayer";
import {
  voiceClipFileNameForBlob,
} from "../../lib/chat/fileAttachment";
import {
  ACCEPTED_UPLOAD_TYPES,
  blobToDataUrl,
  createFilePreview,
  formatFileSize,
  getFileBaseName,
  previewsToAttachments,
  revokeBlobPreviewUrl,
} from "../../lib/chat/composerAttachments";

function MessageAttachments({ message }: { message: Message }) {
  if (!message.attachments?.length) return null;

  const downloadAttachment = (att: Attachment) => {
    if (!att.url) return;
    const link = document.createElement("a");
    link.href = att.url;
    link.download = getFileBaseName(att.name) || "download";
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-wrap gap-2 mb-1">
      {message.attachments.map((att) => (
        <div key={att.id} className="shrink-0">
          {attachmentShouldRenderAsVideo(att) && att.url ? (
            <div className="flex flex-col gap-1">
              <ChatVideoPlayer url={att.url} maxWidth={280} />
              <a
                href={att.url}
                download={getFileBaseName(att.name) || "video"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-600 hover:underline cursor-pointer"
              >
                Download
              </a>
            </div>
          ) : att.type === "image" && att.url ? (
            <a
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              download={getFileBaseName(att.name) || "image"}
              className="relative block h-[150px] w-[200px] cursor-pointer overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
            >
              <Image
                src={att.url}
                alt={att.name}
                fill
                unoptimized
                className="object-cover"
              />
            </a>
          ) : att.type === "audio" && att.url ? (
            <div className="rounded-lg [color-scheme:light]">
              <audio
                src={att.url}
                controls
                className="max-w-[220px] rounded-md"
                preload="metadata"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => downloadAttachment(att)}
              disabled={!att.url}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiFile className="h-4 w-4 shrink-0 text-gray-700" />
              <span className="max-w-[150px] truncate">{att.name}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function createAnonymousCustomer(): User {
  return {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : `customer-${Date.now()}`,
    name: "Customer",
    role: "customer",
  };
}

export function CustomerChat() {
  const [customer] = useState<User>(createAnonymousCustomer);
  const chat = useWebSocketChat(customer);

  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [filePreviews, setFilePreviews] = useState<ComposerFilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const draftTextareaRef = useAutoGrowTextarea(draft);

  const messagesTailKey = useMemo(() => {
    const list = chat.activeMessages;
    if (!list.length) return "";
    return stableMessageListKey(list[list.length - 1]);
  }, [chat.activeMessages]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const run = () => {
      el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, [chat.activeChat?.id, chat.activeMessages.length, messagesTailKey]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newPreviews: ComposerFilePreview[] = [];
    for (const file of Array.from(files)) {
      newPreviews.push(await createFilePreview(file));
    }
    setFilePreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFilePreview = (id: string) => {
    setFilePreviews((prev) => {
      const fp = prev.find((p) => p.id === id);
      revokeBlobPreviewUrl(fp?.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleVoiceRecordingComplete = async (blob: Blob) => {
    const url = await blobToDataUrl(blob);
    const id = Math.random().toString(36).slice(2);
    const name = voiceClipFileNameForBlob(blob);
    const file = new File([blob], name, {
      type: blob.type || "audio/ogg",
    });
    setFilePreviews((prev) => [
      ...prev,
      { id, file, type: "audio", previewUrl: url },
    ]);
  };

  const handleRecorderOpenChange = useCallback((recorderOpen: boolean) => {
    if (recorderOpen) setShowEmojiPicker(false);
  }, []);

  const handleEmojiSelect = (emoji: { native: string }) => {
    setDraft((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text && filePreviews.length === 0) return;

    const attachments: Attachment[] = previewsToAttachments(filePreviews);

    const payload =
      attachments.length > 0 ? attachments : undefined;
    const files =
      filePreviews.length > 0 ? filePreviews.map((fp) => fp.file) : undefined;

    if (chat.activeChat) {
      void chat.sendMessage(text, payload, files);
    } else {
      void chat.startChat(text, payload, files);
    }
    setDraft("");
    setFilePreviews([]);
    setShowEmojiPicker(false);
  };

  const canSend = draft.trim().length > 0 || filePreviews.length > 0;

  return (
    <section className="my-auto mb-20 flex h-[80vh] max-w-5xl w-full flex-1 flex-col justify-center bg-white min-h-0">
      <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white/80">
        <h1 className="text-sm font-semibold text-gray-900">
          Customer Chat Demo
        </h1>
      </div>

      <div
        ref={messagesScrollRef}
        className="min-h-0 flex-1 flex flex-col gap-3 overflow-y-auto bg-[#f8fafc] p-6"
      >
        {chat.activeChat &&
          chat.activeMessages.map((message) => {
            const isMine = message.senderId === customer.id;
            return (
              <div
                key={stableMessageListKey(message)}
                className={`flex min-w-0 items-start gap-2 max-w-[80%] ${
                  isMine ? "self-end flex-row-reverse" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 mb-1 shrink-0">
                  {isMine ? "Me" : "Ag"}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <MessageAttachments message={message} />
                  {message.text ? (
                    <div
                      className={
                        "px-4 py-2.5 rounded-2xl shadow-sm text-sm min-w-0 max-w-[min(70vw,100%)] " +
                        (isMine
                          ? "bg-brand-600 text-white"
                          : "bg-white border border-gray-100 text-gray-800")
                      }
                    >
                      <ExpandableMessageText
                        text={message.text}
                        tone={isMine ? "inverse" : "default"}
                      />
                    </div>
                  ) : null}
                  <span className="text-[10px] text-gray-400">
                    {formatMessageTimeLabelFromMessage(message)}
                  </span>
                </div>
              </div>
            );
          })}

        {!chat.activeChat && (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Send a message to start a new chat with an agent.
          </div>
        )}
      </div>

      {filePreviews.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 shrink-0">
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
                    <div className="rounded-md bg-gray-50 p-1 [color-scheme:light]">
                      <audio
                        src={fp.previewUrl}
                        controls
                        className="h-8 w-[120px] max-w-[120px]"
                        preload="metadata"
                      />
                    </div>
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

      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white border-t border-gray-200 shrink-0"
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl flex items-center focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_UPLOAD_TYPES}
              onChange={handleFileSelect}
              className="hidden"
              id="customer-file-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer"
              title="Attach file"
            >
              <FiPaperclip className="w-5 h-5" />
            </button>

            <textarea
              ref={draftTextareaRef}
              rows={1}
              placeholder="Type your message..."
              className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 py-3 text-sm resize-none min-h-[44px] max-h-[215px] overflow-y-auto outline-none text-gray-700"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={() => setShowEmojiPicker(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            <ChatAudioRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              onOpenChange={handleRecorderOpenChange}
              onError={(msg) => toast.error(msg)}
            />

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

          <button
            type="submit"
            disabled={!canSend}
            className="w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
