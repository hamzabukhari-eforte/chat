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
import {
  FiChevronDown,
  FiInfo,
  FiSend,
  FiSmile,
  FiPaperclip,
  FiX,
  FiFile,
  FiMic,
  FiSearch,
} from "react-icons/fi";
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileCsv,
  FaFileAlt,
} from "react-icons/fa";
import { TicketDrawerSection } from "./TicketDrawerSection";
import { ExpandableMessageText } from "../atoms/ExpandableMessageText";
import { AvatarWithInitials } from "../atoms/AvatarWithInitials";
import { MessageSeenTicks } from "../atoms/MessageSeenTicks";
import { ChatAudioRecorder } from "../atoms/ChatAudioRecorder";
import { ChatVideoPlayer } from "../atoms/ChatVideoPlayer";
import {
  isVideoFile,
  voiceClipFileNameForBlob,
} from "../../lib/chat/fileAttachment";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineTicket,
} from "react-icons/hi2";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { attachmentShouldRenderAsVideo } from "../../lib/chat/attachmentDisplay";
import { stableMessageListKey } from "../../lib/chat/messageKey";
import {
  formatChatDateSeparatorLabel,
  formatMessageTimeLabelFromMessage,
  messageGroupKeyFromHeader,
} from "../../lib/chat/sesMessageTime";
import { toast } from "sonner";
import { useAutoGrowTextarea } from "../../hooks/useAutoGrowTextarea";
import type {
  Attachment,
  Chat,
  CustomerChatTicket,
  Message,
  TransferAgentOption,
} from "../../lib/chat/types";

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
  /** Optional — defaults to a demo toast. */
  onTransferToQueue?: () => void;
  /** Optional — defaults to a demo toast. */
  onTransferToAgent?: (agentId: string, agentName: string) => void;
  /** From getQueueNAssignedChats `userList` (id → name). */
  transferAgents?: TransferAgentOption[];
  /** From getQueueNAssignedChats `domainList` (id → label). */
  ticketDomains?: { id: string; name: string }[];
  /** From getQueueNAssignedChats `emailTemplates` (id → label). */
  ticketEmailTemplates?: { id: string; name: string }[];
  /** From getQueueNAssignedChats `smsTemplates` (id → label). */
  ticketSmsTemplates?: { id: string; name: string }[];
  /** Logged-in agent id for ticket / SES register-complaint calls. */
  agentUserId: string;
  /** Tickets for the open chat (refreshed when the ticket drawer opens). */
  ticketList?: CustomerChatTicket[];
  ticketsLoading?: boolean;
  onTicketDrawerOpen?: () => void;
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

function revokeBlobPreviewUrl(url: string | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
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
  onTransferToQueue,
  onTransferToAgent,
  transferAgents = [],
  ticketDomains = [],
  ticketEmailTemplates = [],
  ticketSmsTemplates = [],
  agentUserId,
  ticketList,
  ticketsLoading = false,
  onTicketDrawerOpen,
}: Props) {
  const [draft, setDraft] = useState("");
  const [transferMenuOpen, setTransferMenuOpen] = useState(false);
  const [transferQueueConfirmOpen, setTransferQueueConfirmOpen] =
    useState(false);
  const [transferAgentModalOpen, setTransferAgentModalOpen] = useState(false);
  const [selectedTransferAgentId, setSelectedTransferAgentId] = useState<
    string | null
  >(null);
  const [transferAgentSearch, setTransferAgentSearch] = useState("");
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [closeChatConfirmOpen, setCloseChatConfirmOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const draftTextareaRef = useAutoGrowTextarea(draft);
  const transferMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transferMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = transferMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setTransferMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [transferMenuOpen]);

  useEffect(() => {
    if (
      !transferQueueConfirmOpen &&
      !transferAgentModalOpen &&
      !transferMenuOpen &&
      !closeChatConfirmOpen
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTransferMenuOpen(false);
        setTransferQueueConfirmOpen(false);
        setTransferAgentModalOpen(false);
        setCloseChatConfirmOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    transferQueueConfirmOpen,
    transferAgentModalOpen,
    transferMenuOpen,
    closeChatConfirmOpen,
  ]);

  useEffect(() => {
    setCloseChatConfirmOpen(false);
  }, [activeChat?.id]);

  useEffect(() => {
    if (!transferAgentModalOpen) setTransferAgentSearch("");
  }, [transferAgentModalOpen]);

  const filteredTransferAgents = useMemo(() => {
    const q = transferAgentSearch.trim().toLowerCase();
    if (!q) return transferAgents;
    return transferAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        String(a.id).toLowerCase().includes(q),
    );
  }, [transferAgents, transferAgentSearch]);

  useEffect(() => {
    if (!transferAgentModalOpen || !selectedTransferAgentId) return;
    if (
      !filteredTransferAgents.some((a) => a.id === selectedTransferAgentId)
    ) {
      setSelectedTransferAgentId(null);
    }
  }, [
    transferAgentModalOpen,
    filteredTransferAgents,
    selectedTransferAgentId,
  ]);

  const openTransferAgentModal = () => {
    setTransferMenuOpen(false);
    setSelectedTransferAgentId(null);
    setTransferAgentSearch("");
    setTransferAgentModalOpen(true);
  };

  const confirmTransferQueue = () => {
    setTransferQueueConfirmOpen(false);
    if (onTransferToQueue) {
      onTransferToQueue();
    } else {
      toast.success("Chat transferred to queue.");
    }
  };

  const confirmTransferAgent = () => {
    if (!selectedTransferAgentId) return;
    const agent = transferAgents.find((a) => a.id === selectedTransferAgentId);
    if (!agent) return;
    setTransferAgentModalOpen(false);
    setSelectedTransferAgentId(null);
    if (onTransferToAgent) {
      onTransferToAgent(agent.id, agent.name);
    } else {
      toast.success(`Transfer to ${agent.name} (demo).`);
    }
  };

  const confirmCloseChat = () => {
    setCloseChatConfirmOpen(false);
    onResolveChat();
  };

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
      const isAudio = file.type.startsWith("audio/");
      const preview: FilePreview = {
        id: Math.random().toString(36).substring(7),
        file,
        type: isImage
          ? "image"
          : isVideo
            ? "video"
            : isAudio
              ? "audio"
              : "document",
      };

      if (isImage || isVideo) {
        preview.previewUrl = await fileToBase64(file);
      } else {
        preview.previewUrl = URL.createObjectURL(file);
      }

      newPreviews.push(preview);
    }

    setFilePreviews((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFilePreview = (id: string) => {
    setFilePreviews((prev) => {
      const fp = prev.find((p) => p.id === id);
      revokeBlobPreviewUrl(fp?.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
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
    link.target = "_blank";
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
    <section className="flex min-h-0 flex-1 flex-col bg-white min-w-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">

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
          <button
            type="button"
            onClick={onToggleCustomerInfo}
            aria-label="Toggle customer info"
            className={
              "w-5 h-5 flex items-center justify-center transition-colors cursor-pointer " +
              (showCustomerInfo
                ? "text-brand-600"
                : "text-gray-500 hover:text-brand-600")
            }
          >
            <FiInfo className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={transferMenuRef}>
            <button
              type="button"
              onClick={() => setTransferMenuOpen((o) => !o)}
              aria-expanded={transferMenuOpen}
              aria-haspopup="menu"
              aria-label="Transfer chat"
              className={
                "h-8 px-2 flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium " +
                "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-pointer"
              }
            >
              Transfer
              <FiChevronDown
                className={
                  "w-3 h-3 shrink-0 transition-transform " +
                  (transferMenuOpen ? "rotate-180" : "")
                }
              />
            </button>
            {transferMenuOpen ? (
              <div
                className="absolute right-0 top-full z-50 mt-1 min-w-[14rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setTransferMenuOpen(false);
                    setTransferQueueConfirmOpen(true);
                  }}
                >
                  Transfer to queue
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                  onClick={openTransferAgentModal}
                >
                  Transfer to agent
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setTicketDrawerOpen(true)}
            aria-label="Open ticket"
            aria-expanded={ticketDrawerOpen}
            className={
              "h-8 px-4 flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium " +
              "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-pointer"
            }
          >
            {/* <HiOutlineTicket className="w-4 h-4" /> */}
            Ticket
          </button>

          <button
            type="button"
            onClick={() => setCloseChatConfirmOpen(true)}
            className="px-2 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer"
          >
            Close Chat
          </button>
        </div>
      </div>

      <TicketDrawerSection
        key={
          ticketDrawerOpen
            ? `ticket-drawer-${activeChat.id}`
            : "ticket-drawer-idle"
        }
        open={ticketDrawerOpen}
        onOpenChange={setTicketDrawerOpen}
        agentUserId={agentUserId}
        customerPhone={activeChat.customer.phone ?? ""}
        domainOptions={ticketDomains}
        emailTemplateOptions={ticketEmailTemplates}
        smsTemplateOptions={ticketSmsTemplates}
        chatIndex={activeChat.whatsappChatIndex ?? activeChat.id}
        ticketList={ticketList ?? activeChat.ticketList ?? []}
        ticketsLoading={ticketsLoading}
        onTicketDrawerOpen={onTicketDrawerOpen}
      />

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
                <div className="flex gap-3 justify-end min-w-0">
                  <div className="flex min-w-0 flex-1 flex-col items-end">
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 justify-end">
                        {message.attachments.map((att) => (
                          <div key={att.id} className="relative shrink-0">
                            {attachmentShouldRenderAsVideo(att) && att.url ? (
                              <div className="flex flex-col items-end gap-1">
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
                                <div className="relative w-[200px] h-[150px]">
                                  <Image
                                    src={att.url}
                                    alt={att.name}
                                    fill
                                    unoptimized
                                    className="rounded-lg object-cover hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              </button>
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
                    {(message.text?.length ?? 0) > 0 && (
                      <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 inline-block max-w-[min(70vw,100%)]">
                        <ExpandableMessageText
                          text={message.text!}
                          tone="inverse"
                        />
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
                <div className="flex min-w-0 gap-3">
                  <AvatarWithInitials
                    name={customerName}
                    src={activeChat.customer.avatar}
                    size={32}
                    alt={customerName}
                  />
                  <div className="min-w-0 flex-1">
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.attachments.map((att) => (
                          <div key={att.id} className="relative shrink-0">
                            {attachmentShouldRenderAsVideo(att) && att.url ? (
                              <div className="flex flex-col items-start gap-1">
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
                                <div className="relative w-[200px] h-[150px]">
                                  <Image
                                    src={att.url}
                                    alt={att.name}
                                    fill
                                    unoptimized
                                    className="rounded-lg object-cover hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              </button>
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
                    {(message.text?.length ?? 0) > 0 && (
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 inline-block max-w-[min(70vw,100%)] text-gray-800">
                        <ExpandableMessageText text={message.text!} />
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

      {/* Transfer to queue — confirmation */}
      {transferQueueConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-queue-title"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setTransferQueueConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2
              id="transfer-queue-title"
              className="text-lg font-semibold text-gray-900"
            >
              Transfer to queue?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to move this conversation back to the queue?
              The customer may be picked up by another agent.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferQueueConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTransferQueue}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
              >
                Yes, transfer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Close chat — confirmation */}
      {closeChatConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-chat-title"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setCloseChatConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2
              id="close-chat-title"
              className="text-lg font-semibold text-gray-900"
            >
              Close this chat?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              The conversation will end for the customer. You can cancel if you
              still need to send a message or transfer the chat instead.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCloseChatConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCloseChat}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
              >
                Yes, close chat
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Transfer to agent — pick agent */}
      {transferAgentModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-agent-title"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setTransferAgentModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2
              id="transfer-agent-title"
              className="text-lg font-semibold text-gray-900"
            >
              Transfer to agent
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select an agent from your team
            </p>
            <div className="mt-4">
              <label
                htmlFor="transfer-agent-search"
                className="mb-1.5 block text-xs font-medium text-gray-600"
              >
                Search
              </label>
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  id="transfer-agent-search"
                  type="search"
                  value={transferAgentSearch}
                  onChange={(e) => setTransferAgentSearch(e.target.value)}
                  placeholder="Name or ID…"
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent cursor-text"
                />
              </div>
            </div>
            <div
              className="mt-3 p-0.5 max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100"
              role="listbox"
              aria-label="Agents"
            >
              {transferAgents.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-500">
                  No agents in the list yet. Refresh after the inbox loads, or
                  check that the API returns id → name fields on the queue
                  response.
                </p>
              ) : filteredTransferAgents.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-500">
                  No agents match your search.
                </p>
              ) : (
                filteredTransferAgents.map((agent) => {
                  const selected = selectedTransferAgentId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setSelectedTransferAgentId(agent.id)}
                      className={
                        "flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors cursor-pointer rounded-md " +
                        (selected
                          ? "bg-brand-50 ring-2 ring-inset ring-brand-500"
                          : "hover:bg-gray-50")
                      }
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${agent?.isLoggedIn ? "bg-green-500" : "bg-gray-200"}`}
                      />

                      <span className="font-medium text-gray-900">
                        {agent.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTransferAgentModalOpen(false);
                  setSelectedTransferAgentId(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTransferAgentId}
                onClick={confirmTransferAgent}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                    <div className="rounded-md [color-scheme:light]">
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
                ref={draftTextareaRef}
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
                className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 py-3 text-sm resize-none max-h-[150px] min-h-[44px] outline-none text-gray-700"
              />

              <ChatAudioRecorder
                onRecordingComplete={handleVoiceRecordingComplete}
                onOpenChange={handleRecorderOpenChange}
                onError={(msg) => toast.error(msg)}
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
