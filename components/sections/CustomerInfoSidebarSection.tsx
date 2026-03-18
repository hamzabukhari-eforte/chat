"use client";

import type { User } from "../../lib/chat/types";

interface Props {
  customer: User | null;
}

export function CustomerInfoSidebarSection({ customer }: Props) {
  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold text-2xl mb-3">
          {customer?.name.charAt(0).toUpperCase() ?? "?"}
        </div>
        <h3 className="font-semibold text-gray-900">
          {customer?.name ?? "No customer selected"}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {customer ? "Active chat customer" : "Choose a chat to see details"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-5 text-sm text-gray-500">
        <p>
          This sidebar can show customer metadata and recent activity. For this
          demo it updates when you select or claim a chat.
        </p>
      </div>
    </aside>
  );
}

