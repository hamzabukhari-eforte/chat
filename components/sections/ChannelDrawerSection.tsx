"use client";

import { useState, type ReactNode } from "react";
import { FiGlobe } from "react-icons/fi";
import { AiOutlineMenuFold, AiOutlineMenuUnfold } from "react-icons/ai";
import {
  SiWhatsapp,
  SiMessenger,
  SiTiktok,
  SiInstagram,
  SiTelegram,
} from "react-icons/si";

export type ChannelId =
  | "whatsapp"
  | "messenger"
  | "webchat"
  | "tiktok"
  | "instagram"
  | "telegram";

interface ChannelDef {
  id: ChannelId;
  label: string;
  icon: ReactNode;
}

const CHANNELS: ChannelDef[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: <SiWhatsapp className="text-xl text-green-500 shrink-0" />,
  },
  {
    id: "messenger",
    label: "Messenger",
    icon: <SiMessenger className="text-xl text-blue-500 shrink-0" />,
  },
  {
    id: "webchat",
    label: "Web Chat",
    icon: <FiGlobe className="text-xl text-indigo-500 shrink-0" />,
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: <SiTiktok className="text-xl text-gray-800 shrink-0" />,
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: <SiInstagram className="text-xl text-pink-500 shrink-0" />,
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: <SiTelegram className="text-xl text-sky-400 shrink-0" />,
  },
];

interface Props {
  activeChannel: ChannelId;
  onChannelChange: (channel: ChannelId) => void;
}

export function ChannelDrawerSection({
  activeChannel,
  onChannelChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const labelClasses = expanded
    ? "max-w-[11rem] opacity-100"
    : "max-w-0 opacity-0 overflow-hidden pointer-events-none";

  return (
    <div
      className={
        "bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 z-20 shrink-0 hide-scroll overflow-x-hidden " +
        (expanded ? "w-56" : "w-16")
      }
    >
      <div
        className={
          "border-b border-gray-100 flex items-center min-h-[52px] overflow-hidden transition-[padding] duration-300 " +
          (expanded ? "justify-between px-4 py-3 gap-2" : "justify-center px-2 py-3")
        }
      >
        <h3
          id="channel-drawer-title"
          className={
            "text-sm font-semibold text-gray-700 whitespace-nowrap transition-[max-width,opacity] duration-300 min-w-0 " +
            labelClasses
          }
        >
          Channels
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
          aria-label={expanded ? "Collapse channels" : "Expand channels"}
          aria-expanded={expanded}
        >
          <AiOutlineMenuUnfold
            className={
              "absolute h-5 w-5 transition-all duration-300 ease-out " +
              (expanded
                ? "scale-75 rotate-12 opacity-0"
                : "scale-100 rotate-0 opacity-100")
            }
            aria-hidden
          />
          <AiOutlineMenuFold
            className={
              "absolute h-5 w-5 transition-all duration-300 ease-out " +
              (expanded
                ? "scale-100 rotate-0 opacity-100"
                : "scale-75 -rotate-12 opacity-0")
            }
            aria-hidden
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {CHANNELS.map((ch) => {
          const isActive = activeChannel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onChannelChange(ch.id)}
              className={
                "w-full flex items-center gap-3 px-4 py-3 transition-colors border-l-[3px] cursor-pointer " +
                (isActive
                  ? "bg-gray-50 border-brand-500"
                  : "border-transparent hover:bg-gray-50 hover:border-brand-500")
              }
            >
              {ch.icon}
              <span
                className={
                  "text-sm font-medium text-gray-700 whitespace-nowrap transition-[max-width,opacity] duration-300 min-w-0 overflow-hidden " +
                  labelClasses
                }
              >
                {ch.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
