"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { useWebSocketChat } from "../../hooks/useWebSocketChat";
import { ChatSidebarSection } from "./ChatSidebarSection";
import { ChatWindowSection } from "./ChatWindowSection";
import { CustomerInfoSidebarSection } from "./CustomerInfoSidebarSection";

export function AgentDashboard() {
  const { user } = useAuth();
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const chat = useWebSocketChat(
    user
      ? {
          id: user.id,
          name: user.name,
          role: user.role,
        }
      : null,
  );

  return (
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
  );
}

