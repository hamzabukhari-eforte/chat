"use client";

import { FiChevronDown, FiInfo, FiMoreVertical } from "react-icons/fi";
import { AvatarWithInitials } from "@/components/atoms/AvatarWithInitials";

interface ChatWindowHeaderProps {
  customerName: string;
  customerAvatar?: string;
  showCustomerInfo: boolean;
  transferMenuOpen: boolean;
  headerOverflowOpen: boolean;
  ticketDrawerOpen: boolean;
  transferMenuRef: React.RefObject<HTMLDivElement | null>;
  headerOverflowRef: React.RefObject<HTMLDivElement | null>;
  onToggleCustomerInfo: () => void;
  onToggleTransferMenu: () => void;
  onOpenTransferQueueConfirm: () => void;
  onOpenTransferAgentModal: () => void;
  onOpenTicketDrawer: () => void;
  onOpenCloseChatConfirm: () => void;
  onToggleHeaderOverflow: () => void;
}

export function ChatWindowHeader({
  customerName,
  customerAvatar,
  showCustomerInfo,
  transferMenuOpen,
  headerOverflowOpen,
  ticketDrawerOpen,
  transferMenuRef,
  headerOverflowRef,
  onToggleCustomerInfo,
  onToggleTransferMenu,
  onOpenTransferQueueConfirm,
  onOpenTransferAgentModal,
  onOpenTicketDrawer,
  onOpenCloseChatConfirm,
  onToggleHeaderOverflow,
}: ChatWindowHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 p-3 sm:p-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <AvatarWithInitials
          name={customerName}
          src={customerAvatar}
          size={40}
          alt={customerName}
        />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {customerName}
          </h3>
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

      <div className="hidden shrink-0 items-center gap-2 xl:flex">
        <div className="relative" ref={transferMenuRef}>
          <button
            type="button"
            onClick={onToggleTransferMenu}
            aria-expanded={transferMenuOpen}
            aria-haspopup="menu"
            aria-label="Transfer chat"
            className={
              "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-2 text-xs font-medium text-gray-700 " +
              "transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
            }
          >
            Transfer
            <FiChevronDown
              className={
                "h-3 w-3 shrink-0 transition-transform " +
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
                className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                onClick={onOpenTransferQueueConfirm}
              >
                Transfer to queue
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                onClick={onOpenTransferAgentModal}
              >
                Transfer to agent
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpenTicketDrawer}
          aria-label="Open ticket"
          aria-expanded={ticketDrawerOpen}
          className={
            "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-4 text-xs font-medium text-gray-700 " +
            "transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
          }
        >
          Ticket
        </button>

        <button
          type="button"
          onClick={onOpenCloseChatConfirm}
          className="cursor-pointer rounded-lg bg-red-50 px-2 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
        >
          Close Chat
        </button>
      </div>

      <div className="relative shrink-0 xl:hidden" ref={headerOverflowRef}>
        <button
          type="button"
          onClick={onToggleHeaderOverflow}
          aria-expanded={headerOverflowOpen}
          aria-haspopup="menu"
          aria-label="Chat actions"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
        >
          <FiMoreVertical className="h-5 w-5" />
        </button>
        {headerOverflowOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[12.5rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
              onClick={onOpenTransferQueueConfirm}
            >
              Transfer to queue
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
              onClick={onOpenTransferAgentModal}
            >
              Transfer to agent
            </button>
            <div className="my-1 h-px bg-gray-100" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
              onClick={onOpenTicketDrawer}
            >
              Ticket
            </button>
            <div className="my-1 h-px bg-gray-100" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={onOpenCloseChatConfirm}
            >
              Close Chat
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
