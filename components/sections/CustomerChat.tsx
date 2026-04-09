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
import { useAuth } from "../../hooks/useAuth";
import { useWebSocketChat } from "../../hooks/useWebSocketChat";
import { attachmentShouldRenderAsVideo } from "../../lib/chat/attachmentDisplay";
import { stableMessageListKey } from "../../lib/chat/messageKey";
import { formatMessageTimeLabelFromMessage } from "../../lib/chat/sesMessageTime";
import type { Attachment, Message } from "../../lib/chat/types";
import { ChatAudioRecorder } from "../atoms/ChatAudioRecorder";
import { ChatVideoPlayer } from "../atoms/ChatVideoPlayer";
import { isVideoFile } from "../../lib/chat/fileAttachment";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const ACCEPTED_VIDEO_TYPES = "video/mp4,video/quicktime,video/webm";
const ACCEPTED_DOC_TYPES = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv";

interface FilePreview {
  id: string;
  file: File;
  type: "image" | "video" | "document" | "audio";
  previewUrl?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function MessageAttachments({ message }: { message: Message }) {
  if (!message.attachments?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-1">
      {message.attachments.map((att) => (
        <div key={att.id} className="shrink-0">
          {attachmentShouldRenderAsVideo(att) && att.url ? (
            <ChatVideoPlayer url={att.url} maxWidth={280} />
          ) : att.type === "image" && att.url ? (
            <Image
              src={att.url}
              alt={att.name}
              width={200}
              height={150}
              unoptimized
              className="rounded-lg object-cover max-w-[200px] max-h-[150px]"
            />
          ) : att.type === "audio" && att.url ? (
            <audio
              src={att.url}
              controls
              className="max-w-[220px] rounded-lg"
              preload="metadata"
            />
          ) : (
            <div
              className={
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-200 text-gray-700"
              }
            >
              <FiFile className="w-4 h-4 shrink-0 text-gray-700" />
              <span className="truncate max-w-[150px]">{att.name}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function CustomerChat() {
  const { user } = useAuth();
  const chat = useWebSocketChat(
    user
      ? {
          id: user.id,
          name: user.name,
          role: user.role,
        }
      : null,
  );

  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

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

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleEmojiSelect = (emoji: { native: string }) => {
    setDraft((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
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
            const isMine = message.senderId === user?.id;
            return (
              <div
                key={stableMessageListKey(message)}
                className={`flex items-start gap-2 max-w-[80%] ${
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
                        "px-4 py-2.5 rounded-2xl shadow-sm text-sm " +
                        (isMine
                          ? "bg-brand-600 text-white"
                          : "bg-white border border-gray-100 text-gray-800")
                      }
                    >
                      {message.text}
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
              accept={`${ACCEPTED_IMAGE_TYPES},${ACCEPTED_VIDEO_TYPES},${ACCEPTED_DOC_TYPES}`}
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
              rows={1}
              placeholder="Type your message..."
              className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 py-3 text-sm resize-none max-h-32 min-h-[44px] outline-none text-gray-700"
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
