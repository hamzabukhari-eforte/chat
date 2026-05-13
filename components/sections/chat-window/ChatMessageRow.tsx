"use client";

import { AvatarWithInitials } from "@/components/atoms/AvatarWithInitials";
import { ExpandableMessageText } from "@/components/atoms/ExpandableMessageText";
import { MessageSeenTicks } from "@/components/atoms/MessageSeenTicks";
import { formatMessageTimeLabelFromMessage } from "@/lib/chat/sesMessageTime";
import { stableMessageListKey } from "@/lib/chat/messageKey";
import type { Attachment, Message } from "@/lib/chat/types";
import { ChatMessageAttachments } from "./ChatMessageAttachments";

interface ChatMessageRowProps {
  message: Message;
  isAgent: boolean;
  agentName: string;
  agentAvatar?: string;
  customerName: string;
  customerAvatar?: string;
  onPreviewImage: (url: string, name: string) => void;
  onDownloadAttachment: (att: Attachment) => void;
}

export function ChatMessageRow({
  message,
  isAgent,
  agentName,
  agentAvatar,
  customerName,
  customerAvatar,
  onPreviewImage,
  onDownloadAttachment,
}: ChatMessageRowProps) {
  const timeStr = formatMessageTimeLabelFromMessage(message);

  if (isAgent) {
    return (
      <div key={stableMessageListKey(message)} className="flex gap-3 justify-end min-w-0">
        <div className="flex min-w-0 flex-1 flex-col items-end">
          {message.attachments && message.attachments.length > 0 && (
            <ChatMessageAttachments
              attachments={message.attachments}
              align="end"
              onPreviewImage={onPreviewImage}
              onDownloadAttachment={onDownloadAttachment}
            />
          )}
          {(message.text?.length ?? 0) > 0 && (
            <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 inline-block max-w-[min(70vw,100%)]">
              <ExpandableMessageText text={message.text!} tone="inverse" />
            </div>
          )}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-gray-400">{timeStr}</span>
            <MessageSeenTicks status={message.chatSeenStatus} />
          </div>
        </div>
        <AvatarWithInitials
          name={agentName}
          src={agentAvatar}
          size={32}
          alt={agentName}
        />
      </div>
    );
  }

  return (
    <div key={stableMessageListKey(message)} className="flex min-w-0 gap-3">
      <AvatarWithInitials
        name={customerName}
        src={customerAvatar}
        size={32}
        alt={customerName}
      />
      <div className="min-w-0 flex-1">
        {message.attachments && message.attachments.length > 0 && (
          <ChatMessageAttachments
            attachments={message.attachments}
            align="start"
            onPreviewImage={onPreviewImage}
            onDownloadAttachment={onDownloadAttachment}
          />
        )}
        {(message.text?.length ?? 0) > 0 && (
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 inline-block max-w-[min(70vw,100%)] text-gray-800">
            <ExpandableMessageText text={message.text!} />
          </div>
        )}
        <span className="text-xs text-gray-400 mt-1 block">{timeStr}</span>
      </div>
    </div>
  );
}
