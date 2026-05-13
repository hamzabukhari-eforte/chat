"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TicketDrawerSection } from "./TicketDrawerSection";
import {
  voiceClipFileNameForBlob,
} from "../../lib/chat/fileAttachment";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
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
import type { ComposerFilePreview } from "../../lib/chat/composerAttachments";
import {
  blobToDataUrl,
  createFilePreview,
  previewsToAttachments,
  revokeBlobPreviewUrl,
} from "../../lib/chat/composerAttachments";
import { ChatMessageRow } from "./chat-window/ChatMessageRow";
import { ChatComposer } from "./chat-window/ChatComposer";
import { ChatWindowHeader } from "./chat-window/ChatWindowHeader";
import { ChatWindowModals } from "./chat-window/ChatWindowModals";

interface Props {
  activeChat: Chat | null;
  messages: Message[];
  isInitialLoading?: boolean;
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
  /** SES context required by ticket review submit API. */
  ticketDomainIndex?: number | null;
  /** SES context required by ticket review submit API. */
  ticketModuleIndex?: number | null;
  /** Tickets for the open chat (refreshed when the ticket drawer opens). */
  ticketList?: CustomerChatTicket[];
  ticketsLoading?: boolean;
  onTicketDrawerOpen?: () => void;
}

/** Prefer `messageHeader` + local time from `createdAt`; fallback to `createdAt` for the pill. */
function dateSeparatorLabelFromMessage(message: Message): string {
  const h = message.messageHeader?.trim();
  const timeLabel = formatMessageTimeLabelFromMessage(message);
  if (h && timeLabel) return `${h}, ${timeLabel}`;
  if (h) return h;
  return formatChatDateSeparatorLabel(message.createdAt);
}

export function ChatWindowSection({
  activeChat,
  messages,
  isInitialLoading = false,
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
  ticketDomainIndex,
  ticketModuleIndex,
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
  const [headerOverflowOpen, setHeaderOverflowOpen] = useState(false);
  const [closeChatConfirmOpen, setCloseChatConfirmOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [filePreviews, setFilePreviews] = useState<ComposerFilePreview[]>([]);
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const draftTextareaRef = useAutoGrowTextarea(draft);
  const transferMenuRef = useRef<HTMLDivElement>(null);
  const headerOverflowRef = useRef<HTMLDivElement>(null);

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
    if (!headerOverflowOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = headerOverflowRef.current;
      if (el && !el.contains(e.target as Node)) {
        setHeaderOverflowOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [headerOverflowOpen]);

  useEffect(() => {
    if (
      !transferQueueConfirmOpen &&
      !transferAgentModalOpen &&
      !transferMenuOpen &&
      !headerOverflowOpen &&
      !closeChatConfirmOpen
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTransferMenuOpen(false);
        setHeaderOverflowOpen(false);
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
    headerOverflowOpen,
    closeChatConfirmOpen,
  ]);

  useEffect(() => {
    setCloseChatConfirmOpen(false);
    setHeaderOverflowOpen(false);
    setTransferMenuOpen(false);
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
    setHeaderOverflowOpen(false);
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPreviews: ComposerFilePreview[] = [];

    for (const file of Array.from(files)) {
      newPreviews.push(await createFilePreview(file));
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

    const attachments: Attachment[] = previewsToAttachments(filePreviews);

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

  if (isInitialLoading) {
    return (
      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex w-full max-w-xs flex-col items-center">
            <div className="mb-4 h-14 w-14 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-4 w-52 animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-3 w-44 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </section>
    );
  }

  if (!activeChat) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col bg-white">
        <div className="flex flex-1 items-center justify-center text-gray-400">
          <div className="text-center">
            <HiOutlineChatBubbleLeftRight className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              Select a chat to start messaging
            </p>
            <p className="mt-1 text-sm text-gray-400">
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
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <ChatWindowHeader
        customerName={customerName}
        customerAvatar={activeChat.customer.avatar}
        showCustomerInfo={showCustomerInfo}
        transferMenuOpen={transferMenuOpen}
        headerOverflowOpen={headerOverflowOpen}
        ticketDrawerOpen={ticketDrawerOpen}
        transferMenuRef={transferMenuRef}
        headerOverflowRef={headerOverflowRef}
        onToggleCustomerInfo={onToggleCustomerInfo}
        onToggleTransferMenu={() => setTransferMenuOpen((o) => !o)}
        onOpenTransferQueueConfirm={() => {
          setTransferMenuOpen(false);
          setHeaderOverflowOpen(false);
          setTransferQueueConfirmOpen(true);
        }}
        onOpenTransferAgentModal={openTransferAgentModal}
        onOpenTicketDrawer={() => {
          setHeaderOverflowOpen(false);
          setTicketDrawerOpen(true);
        }}
        onOpenCloseChatConfirm={() => {
          setHeaderOverflowOpen(false);
          setCloseChatConfirmOpen(true);
        }}
        onToggleHeaderOverflow={() => setHeaderOverflowOpen((o) => !o)}
      />

      <TicketDrawerSection
        key={
          ticketDrawerOpen
            ? `ticket-drawer-${activeChat.id}`
            : "ticket-drawer-idle"
        }
        open={ticketDrawerOpen}
        onOpenChange={setTicketDrawerOpen}
        agentUserId={agentUserId}
        domainIndex={ticketDomainIndex}
        moduleIndex={ticketModuleIndex}
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
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 md:p-6"
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

              <ChatMessageRow
                message={message}
                isAgent={isAgent}
                agentName={agentName}
                agentAvatar={activeChat.agent?.avatar}
                customerName={customerName}
                customerAvatar={activeChat.customer.avatar}
                onPreviewImage={(url, name) => setImagePreview({ url, name })}
                onDownloadAttachment={downloadAttachment}
              />
            </div>
          );
        })}
      </div>

      <ChatWindowModals
        imagePreview={imagePreview}
        transferQueueConfirmOpen={transferQueueConfirmOpen}
        closeChatConfirmOpen={closeChatConfirmOpen}
        transferAgentModalOpen={transferAgentModalOpen}
        transferAgentSearch={transferAgentSearch}
        transferAgents={transferAgents}
        filteredTransferAgents={filteredTransferAgents}
        selectedTransferAgentId={selectedTransferAgentId}
        onCloseImagePreview={() => setImagePreview(null)}
        onCloseTransferQueueConfirm={() => setTransferQueueConfirmOpen(false)}
        onConfirmTransferQueue={confirmTransferQueue}
        onCloseCloseChatConfirm={() => setCloseChatConfirmOpen(false)}
        onConfirmCloseChat={confirmCloseChat}
        onCloseTransferAgentModal={() => {
          setTransferAgentModalOpen(false);
          setSelectedTransferAgentId(null);
        }}
        onTransferAgentSearchChange={setTransferAgentSearch}
        onSelectTransferAgent={setSelectedTransferAgentId}
        onConfirmTransferAgent={confirmTransferAgent}
      />

      <ChatComposer
        draft={draft}
        showEmojiPicker={showEmojiPicker}
        filePreviews={filePreviews}
        fileInputRef={fileInputRef}
        emojiPickerRef={emojiPickerRef}
        draftTextareaRef={draftTextareaRef}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
        onFileSelect={handleFileSelect}
        onRemoveFilePreview={removeFilePreview}
        onToggleEmojiPicker={() => setShowEmojiPicker((prev) => !prev)}
        onHideEmojiPicker={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
        onVoiceRecordingComplete={handleVoiceRecordingComplete}
        onRecorderOpenChange={handleRecorderOpenChange}
        onRecorderError={(msg) => toast.error(msg)}
      />
    </section>
  );
}
