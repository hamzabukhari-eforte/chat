"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FiArrowLeft, FiChevronDown } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OnlineStatus } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const STATUS_ORDER: OnlineStatus[] = ["online", "away", "offline"];

const STATUS_META: Record<
  OnlineStatus,
  { label: string; dot: string; trigger: string; item: string }
> = {
  online: {
    label: "Online",
    dot: "bg-emerald-500",
    trigger:
      "border-emerald-100 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90",
    item: "hover:bg-emerald-50",
  },
  away: {
    label: "Away",
    dot: "bg-amber-500",
    trigger:
      "border-amber-100 bg-amber-50 text-amber-950 hover:bg-amber-100/90",
    item: "hover:bg-amber-50",
  },
  offline: {
    label: "Offline",
    dot: "bg-gray-400",
    trigger: "border-gray-100 bg-gray-50 text-gray-800 hover:bg-gray-100",
    item: "hover:bg-gray-100",
  },
};

type Props = {
  /** Optional label next to the back control (e.g. agent display name). */
  agentName?: string;
};

export function AgentAppHeader(_props: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OnlineStatus>("online");
  const [open, setOpen] = useState(false);

  const onBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-1.5 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onBack}
          aria-label="Go back"
          className="shrink-0 border-gray-200 text-gray-700 hover:bg-gray-50 h-8"
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden />
        </Button>
        {/* {agentName ? (
          <span
            className="min-w-0 flex-1 wrap-break-word text-sm font-semibold leading-snug text-gray-900 sm:text-base"
            title={agentName}
          >
            {agentName}
          </span>
        ) : null} */}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 h-8",
              STATUS_META[status].trigger,
            )}
            aria-label="Presence status"
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full ring-2 ring-white/80",
                STATUS_META[status].dot,
              )}
              aria-hidden
            />
            <span className="hidden sm:inline">{STATUS_META[status].label}</span>
            <span className="sm:hidden">Status</span>
            <FiChevronDown className="h-4 w-4 opacity-70" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1">
          <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-gray-500">
            Your status
          </p>
          <ul className="space-y-0.5" role="listbox">
            {STATUS_ORDER.map((s) => (
              <li key={s} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={s === status}
                  onClick={() => {
                    setStatus(s);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-800 transition-colors cursor-pointer",
                    STATUS_META[s].item,
                    s === status && "bg-gray-100 font-semibold text-gray-900",
                  )}
                >
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_META[s].dot)}
                    aria-hidden
                  />
                  {STATUS_META[s].label}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </header>
  );
}
