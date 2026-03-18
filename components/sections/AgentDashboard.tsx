"use client";

import { useState } from "react";
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
      {showCustomerInfo && (
        <CustomerInfoSidebarSection customer={chat.activeChat?.customer ?? null} />
      )}
    </>
  );
}

