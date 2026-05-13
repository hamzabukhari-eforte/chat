"use client";

import Image from "next/image";
import { FiSearch, FiX } from "react-icons/fi";
import type { TransferAgentOption } from "@/lib/chat/types";

interface ChatWindowModalsProps {
  imagePreview: { url: string; name: string } | null;
  transferQueueConfirmOpen: boolean;
  closeChatConfirmOpen: boolean;
  transferAgentModalOpen: boolean;
  transferAgentSearch: string;
  transferAgents: TransferAgentOption[];
  filteredTransferAgents: TransferAgentOption[];
  selectedTransferAgentId: string | null;
  onCloseImagePreview: () => void;
  onCloseTransferQueueConfirm: () => void;
  onConfirmTransferQueue: () => void;
  onCloseCloseChatConfirm: () => void;
  onConfirmCloseChat: () => void;
  onCloseTransferAgentModal: () => void;
  onTransferAgentSearchChange: (value: string) => void;
  onSelectTransferAgent: (agentId: string) => void;
  onConfirmTransferAgent: () => void;
}

export function ChatWindowModals({
  imagePreview,
  transferQueueConfirmOpen,
  closeChatConfirmOpen,
  transferAgentModalOpen,
  transferAgentSearch,
  transferAgents,
  filteredTransferAgents,
  selectedTransferAgentId,
  onCloseImagePreview,
  onCloseTransferQueueConfirm,
  onConfirmTransferQueue,
  onCloseCloseChatConfirm,
  onConfirmCloseChat,
  onCloseTransferAgentModal,
  onTransferAgentSearchChange,
  onSelectTransferAgent,
  onConfirmTransferAgent,
}: ChatWindowModalsProps) {
  return (
    <>
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) onCloseImagePreview();
          }}
        >
          <div className="relative w-[40vw] h-[60vh] max-h-[700px] rounded-lg overflow-hidden bg-black">
            <button
              type="button"
              onClick={onCloseImagePreview}
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

      {transferQueueConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-queue-title"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) onCloseTransferQueueConfirm();
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
                onClick={onCloseTransferQueueConfirm}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmTransferQueue}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
              >
                Yes, transfer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closeChatConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-chat-title"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) onCloseCloseChatConfirm();
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="close-chat-title" className="text-lg font-semibold text-gray-900">
              Close this chat?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              The conversation will end for the customer. You can cancel if you
              still need to send a message or transfer the chat instead.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCloseCloseChatConfirm}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmCloseChat}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
              >
                Yes, close chat
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {transferAgentModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-agent-title"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) onCloseTransferAgentModal();
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
                  onChange={(e) => onTransferAgentSearchChange(e.target.value)}
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
                  check that the API returns id → name fields on the queue response.
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
                      onClick={() => onSelectTransferAgent(agent.id)}
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
                onClick={onCloseTransferAgentModal}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTransferAgentId}
                onClick={onConfirmTransferAgent}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
