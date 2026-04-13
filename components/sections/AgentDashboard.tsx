"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWebSocketChat } from "../../hooks/useWebSocketChat";
import {
  // ChannelDrawerSection,
  type ChannelId,
} from "./ChannelDrawerSection";
import { ChatSidebarSection } from "./ChatSidebarSection";
import { ChatWindowSection } from "./ChatWindowSection";
import { CustomerInfoSidebarSection } from "./CustomerInfoSidebarSection";

const CHANNEL_PLACEHOLDER: Record<
  Exclude<ChannelId, "webchat">,
  { title: string; subtitle: string }
> = {
  whatsapp: {
    title: "WhatsApp",
    subtitle: "Inbox for this channel is not connected yet. Use Web Chat for live conversations.",
  },
  messenger: {
    title: "Messenger",
    subtitle: "Inbox for this channel is not connected yet. Use Web Chat for live conversations.",
  },
  tiktok: {
    title: "TikTok",
    subtitle: "Inbox for this channel is not connected yet. Use Web Chat for live conversations.",
  },
  instagram: {
    title: "Instagram",
    subtitle: "Inbox for this channel is not connected yet. Use Web Chat for live conversations.",
  },
  telegram: {
    title: "Telegram",
    subtitle: "Inbox for this channel is not connected yet. Use Web Chat for live conversations.",
  },
};

const STATIC_AGENT = {
  id: "mahnoor.z",
  name: "Mahnoor",
  role: "agent" as const,
};

export function AgentDashboard() {
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelId>("webchat");

  const chat = useWebSocketChat(STATIC_AGENT);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      {/* <ChannelDrawerSection
        activeChannel={activeChannel}
        onChannelChange={setActiveChannel}
      /> */}

      {activeChannel === "webchat" ? (
        <>
          <ChatSidebarSection
            queue={chat.queue}
            myChats={chat.myChats}
            activeChatId={chat.activeChatId}
            onSelectChat={chat.selectChat}
            onClaimChat={chat.claimChat}
          />
          <ChatWindowSection
            activeChat={chat.activeChat}
            messages={chat.activeMessages}
            onSendMessage={chat.sendMessage}
            onResolveChat={chat.resolveChat}
            onToggleCustomerInfo={() => setShowCustomerInfo((prev) => !prev)}
            showCustomerInfo={showCustomerInfo}
            transferAgents={chat.transferAgents}
            onTransferToQueue={chat.transferToQueue}
            onTransferToAgent={chat.transferToAgent}
          />
          <AnimatePresence>
            {showCustomerInfo && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 288, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden shrink-0"
              >
                <CustomerInfoSidebarSection
                  customer={chat.activeChat?.customer ?? null}
                  onClose={() => setShowCustomerInfo(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-surface text-center px-6">
          <p className="text-lg font-semibold text-gray-800">
            {CHANNEL_PLACEHOLDER[activeChannel].title}
          </p>
          <p className="mt-2 text-sm text-gray-500 max-w-md">
            {CHANNEL_PLACEHOLDER[activeChannel].subtitle}
          </p>
          <button
            type="button"
            onClick={() => setActiveChannel("webchat")}
            className="mt-6 px-4 py-2 rounded-lg bg-brand-600 text-white  text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
          >
            Open Web Chat
          </button>
        </div>
      )}
    </div>
  );
}
