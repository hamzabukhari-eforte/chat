"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWebSocketChat } from "../../hooks/useWebSocketChat";
import {
  // ChannelDrawerSection,
  type ChannelId,
} from "./ChannelDrawerSection";
import { AgentAppHeader } from "./AgentAppHeader";
import { ChatSidebarSection } from "./ChatSidebarSection";
import { ChatWindowSection } from "./ChatWindowSection";
import { CustomerInfoSidebarSection } from "./CustomerInfoSidebarSection";
import { AGENT_APP_HEADER_HEIGHT_VAR } from "@/lib/layout/agentAppLayout";
import { cn } from "@/lib/utils";

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

function isBelowXlViewport(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(min-width: 1280px)").matches;
}

function subscribeBelowXl(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(max-width: 1279px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getBelowXlSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1279px)").matches;
}

export function AgentDashboard() {
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  /** Below `xl`, inbox (queue / my chats) and chat are separate full-height panes. */
  const [showMobileInbox, setShowMobileInbox] = useState(true);
  const [activeChannel, setActiveChannel] = useState<ChannelId>("webchat");
  const agentHeaderMeasureRef = useRef<HTMLDivElement>(null);
  const [agentHeaderHeightPx, setAgentHeaderHeightPx] = useState(56);

  const chat = useWebSocketChat(STATIC_AGENT);

  const belowXl = useSyncExternalStore(
    subscribeBelowXl,
    getBelowXlSnapshot,
    () => false,
  );

  useLayoutEffect(() => {
    const el = agentHeaderMeasureRef.current;
    if (!el) return;
    const measure = () => {
      setAgentHeaderHeightPx(Math.ceil(el.getBoundingClientRect().height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleToggleCustomerInfo = useCallback(() => {
    setShowCustomerInfo((wasOpen) => !wasOpen);
  }, []);

  /** Load tickets when opening the info panel — not inside `setState` (Strict Mode may run updaters twice in dev). */
  useEffect(() => {
    if (!showCustomerInfo || !chat.activeChatId) return;
    void chat.refreshActiveChatTickets();
  }, [
    showCustomerInfo,
    chat.activeChatId,
    chat.refreshActiveChatTickets,
  ]);

  useEffect(() => {
    if (!chat.activeChatId || !chat.activeChat) {
      setShowCustomerInfo(false);
    }
  }, [chat.activeChatId, chat.activeChat?.id]);

  useEffect(() => {
    if (!chat.activeChatId) {
      setShowMobileInbox(true);
    }
  }, [chat.activeChatId]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      chat.selectChat(chatId);
      if (isBelowXlViewport()) {
        setShowMobileInbox(false);
      }
    },
    [chat],
  );

  const handleBackToMobileInbox = useCallback(() => {
    setShowMobileInbox(true);
    setShowCustomerInfo(false);
  }, []);

  const handleResumeOpenChat = useCallback(() => {
    if (isBelowXlViewport()) {
      setShowMobileInbox(false);
    }
  }, []);

  const hasConversationMessages =
    Boolean(chat.activeChatId) && chat.activeMessages.length > 0;
  const customerInfoProps = {
    customer: chat.activeChat?.customer ?? null,
    ticketList: chat.activeChat?.ticketList,
    ticketsLoading: chat.ticketListLoading,
    hasConversationMessages,
    onClose: () => setShowCustomerInfo(false),
  };

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      style={
        {
          [AGENT_APP_HEADER_HEIGHT_VAR]: `${agentHeaderHeightPx}px`,
        } as CSSProperties
      }
    >
      <div ref={agentHeaderMeasureRef} className="shrink-0">
        <AgentAppHeader
          agentName={STATIC_AGENT.name}
          awayReasons={chat.awayReasons}
          preferInboxNavOnBack={belowXl && !showMobileInbox}
          onBackToInbox={handleBackToMobileInbox}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
        {/* <ChannelDrawerSection
        activeChannel={activeChannel}
        onChannelChange={setActiveChannel}
      /> */}

        {activeChannel === "webchat" ? (
        <>
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:flex-none xl:shrink-0",
              !showMobileInbox && "max-xl:hidden",
            )}
          >
            <ChatSidebarSection
              queue={chat.queue}
              myChats={chat.myChats}
              isInitialLoading={chat.isInitialLoading}
              showQueue={chat.showQueue}
              activeChatId={chat.activeChatId}
              onSelectChat={handleSelectChat}
              onClaimChat={chat.claimChat}
              showResumeOpenChat={
                Boolean(chat.activeChatId && chat.activeChat) &&
                showMobileInbox
              }
              resumeChatCustomerName={
                chat.activeChat?.customer.name?.trim() || "this customer"
              }
              onResumeOpenChat={handleResumeOpenChat}
            />
          </div>
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              showMobileInbox && "max-xl:hidden",
            )}
          >
            <ChatWindowSection
              activeChat={chat.activeChat}
              messages={chat.activeMessages}
              isInitialLoading={chat.isInitialLoading}
              onSendMessage={chat.sendMessage}
              onResolveChat={chat.resolveChat}
              onToggleCustomerInfo={handleToggleCustomerInfo}
              showCustomerInfo={showCustomerInfo}
              transferAgents={chat.transferAgents}
              ticketDomains={chat.ticketDomains}
              ticketEmailTemplates={chat.ticketEmailTemplates}
              ticketSmsTemplates={chat.ticketSmsTemplates}
              agentUserId={STATIC_AGENT.id}
              ticketDomainIndex={chat.domainIndex}
              ticketModuleIndex={chat.moduleIndex}
              onTransferToQueue={chat.transferToQueue}
              onTransferToAgent={chat.transferToAgent}
              ticketList={chat.activeChat?.ticketList}
              ticketsLoading={chat.ticketListLoading}
              onTicketDrawerOpen={chat.refreshActiveChatTickets}
            />
          </div>
          <AnimatePresence>
            {showCustomerInfo && (
              <>
                {belowXl ? (
                  <motion.div
                    key="customer-info-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{
                      top: `var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px)`,
                      height: `calc(100dvh - var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px))`,
                    }}
                    className="pointer-events-none fixed inset-x-0 z-10 bg-black/15 backdrop-blur-sm"
                    aria-hidden
                  />
                ) : null}
                {belowXl ? (
                  <motion.aside
                  key="customer-info-mobile"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 32, stiffness: 360 }}
                  style={{
                    top: `var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px)`,
                    height: `calc(100dvh - var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px))`,
                    maxHeight: `calc(100dvh - var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px))`,
                  }}
                  className="fixed right-0 z-40 flex w-[92vw] max-w-[360px] flex-col overflow-hidden border-l border-gray-200 bg-white shadow-none xl:hidden"
                >
                  <div className="h-full [&>aside]:h-full [&>aside]:w-full [&>aside]:min-w-0">
                    <CustomerInfoSidebarSection {...customerInfoProps} />
                  </div>
                  </motion.aside>
                ) : (
                  <motion.div
                  key="customer-info-desktop"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 288, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="z-20 overflow-hidden shrink-0"
                >
                  <CustomerInfoSidebarSection {...customerInfoProps} />
                  </motion.div>
                )}
              </>
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
    </div>
  );
}
