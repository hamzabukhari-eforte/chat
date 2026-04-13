"use client";

import { FiMail, FiPhone, FiClock, FiShoppingCart, FiTag, FiX } from "react-icons/fi";
import { AvatarWithInitials } from "../atoms/AvatarWithInitials";
import type { User } from "../../lib/chat/types";

interface Props {
  customer: User | null;
  onClose: () => void;
}

interface ActivityItem {
  id: string;
  icon: "cart" | "ticket";
  title: string;
  date: string;
}

const recentActivity: ActivityItem[] = [

  {
    id: "1",
    icon: "ticket",
    title: "Ticket #64803 Closed",
    date: "Apr 22nd, 2025",
  },
];

export function CustomerInfoSidebarSection({ customer, onClose }: Props) {
  // const localTime = new Date().toLocaleTimeString([], {
  //   hour: "numeric",
  //   minute: "2-digit",
  // });

  return (
    <aside className="w-72 min-w-72 bg-white border-l border-gray-200 flex flex-col h-full relative">
      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close customer info"
        className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer z-10"
      >
        <FiX className="w-4 h-4" />
      </button>

      {/* Profile Header */}
      <div className="p-5 pt-10 border-b border-gray-100 flex flex-col items-center text-center">
        <AvatarWithInitials
          name={customer?.name ?? "?"}
          src={customer?.avatar}
          size={80}
          className="border-4 border-white shadow-sm mb-3"
          alt={customer?.name ?? "Customer"}
        />
        <h3 className="font-semibold text-gray-900 mb-3">
          {customer?.name ?? "No customer selected"}
        </h3>
        {/* <p className="text-sm text-gray-500 mb-3">
          {customer?.plan ?? "Standard Plan"}
        </p> */}
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Profile
          </button>
          <button
            type="button"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            History
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-5 px-4">
        {/* About Section */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            About
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <FiMail className="text-gray-400 mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-gray-700 break-all">
                {customer?.email ?? "customer@email.com"}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <FiPhone className="text-gray-400 mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-gray-700">
                {customer?.phone ?? "0813-0000-0000"}
              </span>
            </li>
            {/* <li className="flex items-start gap-3">
              <FiClock className="text-gray-400 mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-gray-700">Local time: {localTime}</span>
            </li> */}
          </ul>
        </div>

        {/* Recent Activity Section */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Activity
          </h4>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div
                  className={
                    "w-8 h-8 rounded flex items-center justify-center shrink-0 " +
                    (activity.icon === "cart"
                      ? "bg-blue-50"
                      : "bg-gray-50 border border-gray-100")
                  }
                >
                  {activity.icon === "cart" ? (
                    <FiShoppingCart className="text-blue-500 w-3.5 h-3.5" />
                  ) : (
                    <FiTag className="text-gray-500 w-3.5 h-3.5" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-800 font-medium">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
