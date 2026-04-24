"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiArrowLeft, FiChevronDown } from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AwayReasonOption } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const ONLINE_META = {
  label: "Online",
  dot: "bg-emerald-500",
  trigger:
    "border-emerald-100 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90",
} as const;

const DROPDOWN_TRIGGER_META = {
  dot: "bg-emerald-500",
  trigger:
    "border-emerald-100 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90",
} as const;

const BREAK_LIST_ITEM = "hover:bg-gray-50";
const HTTP_API_ORIGIN = "http://10.0.10.53:8080";
const GET_AWAY_REASON_PATH = "/SES/app/getawayreason";

function getApiOrigin(): string {
  if (typeof window === "undefined") return HTTP_API_ORIGIN;
  return window.location.protocol === "https:"
    ? window.location.origin
    : HTTP_API_ORIGIN;
}

function getAwayReasonUrl(): string {
  return `${getApiOrigin()}${GET_AWAY_REASON_PATH}`.replace(/\/$/, "");
}

function getApiFetchCredentials(): RequestCredentials {
  return process.env.NODE_ENV === "development" ? "omit" : "include";
}

async function postAwayReason(reason: string): Promise<void> {
  const res = await fetch(getAwayReasonUrl(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
    body: JSON.stringify({
      status: "Away",
      reason,
      check: "0",
    }),
  });
  if (!res.ok) {
    throw new Error(`getawayreason failed: ${res.status}`);
  }
}

async function postReturnOnline(password: string): Promise<boolean> {
  const res = await fetch(getAwayReasonUrl(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
    body: JSON.stringify({
      password,
      check: "0",
    }),
  });
  return res.ok;
}

type BreakSession = {
  awayReasonId: string;
  reasonLabel: string;
};

type Props = {
  /** Optional label next to the back control (e.g. agent display name). */
  agentName?: string;
  /** From `getQueueNAssignedChats` → `awayReasons` (break types in status menu). */
  awayReasons?: AwayReasonOption[];
};

export function AgentAppHeader({
  agentName: _agentName,
  awayReasons = [],
}: Props) {
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [breakSession, setBreakSession] = useState<BreakSession | null>(null);
  const [settingAwayId, setSettingAwayId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onBreak = Boolean(breakSession);

  useEffect(() => {
    if (!breakSession) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [breakSession]);

  useEffect(() => {
    if (!breakSession) return;
    if (awayReasons.some((r) => r.id === breakSession.awayReasonId)) return;
    setBreakSession(null);
    setPassword("");
  }, [awayReasons, breakSession]);

  const onBack = useCallback(() => {
    router.back();
  }, [router]);

  const hasOptions = awayReasons.length > 0;

  const handleImBack = useCallback(async () => {
    const trimmed = password.trim();
    if (!trimmed) {
      toast.error("Enter your password to return.");
      return;
    }
    setSubmitting(true);
    try {
      const ok = await postReturnOnline(trimmed);
      if (!ok) {
        toast.error("Invalid password, please try again");
        return;
      }
      setBreakSession(null);
      setPassword("");
      setPopoverOpen(false);
      toast.success("You're back online");
    } finally {
      setSubmitting(false);
    }
  }, [password]);

  const modal =
    breakSession && typeof document !== "undefined"
      ? createPortal(
      <div
        className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-away-title"
        aria-describedby="break-away-desc"
      >
        <div
          className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2
            id="break-away-title"
            className="text-lg font-semibold text-gray-900"
          >
            {breakSession.reasonLabel}
          </h2>
          <p id="break-away-desc" className="mt-1 text-sm text-gray-600">
            You are on a break. Enter your password to unlock the app.
          </p>

          <Field className="mt-6">
            <FieldLabel htmlFor="break-return-password">Password</FieldLabel>
            <input
              id="break-return-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleImBack();
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="Password"
              disabled={submitting}
            />
          </Field>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              className="bg-brand-600 text-white hover:bg-brand-700"
              disabled={submitting}
              onClick={() => void handleImBack()}
            >
              {submitting ? "Checking…" : "I'm back"}
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    )
      : null;

  return (
    <>
      {modal}

      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-1.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onBack}
            aria-label="Go back"
            disabled={onBreak}
            className="shrink-0 border-gray-200 text-gray-700 hover:bg-gray-50 h-8 disabled:pointer-events-none disabled:opacity-40"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {hasOptions ? (
          <Popover open={popoverOpen && !onBreak} onOpenChange={(o) => !onBreak && setPopoverOpen(o)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={onBreak}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 h-8 disabled:pointer-events-none disabled:opacity-40",
                  DROPDOWN_TRIGGER_META.trigger,
                )}
                aria-label="Open break status menu"
                aria-expanded={popoverOpen}
                aria-haspopup="dialog"
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full ring-2 ring-white/80",
                    ONLINE_META.dot,
                  )}
                  aria-hidden
                />
                <span className="max-w-48 truncate sm:max-w-64">
                  Online
                </span>
                <FiChevronDown className="h-4 w-4 opacity-70" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-56 p-1 max-h-[min(22rem,70vh)] overflow-y-auto"
            >
              <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-gray-500">
                Start a break
              </p>
              <ul className="space-y-0.5" role="listbox">
                {awayReasons.map((r) => (
                  <li key={r.id} role="none">
                    <button
                      type="button"
                      role="option"
                      disabled={settingAwayId === r.id}
                      onClick={() => {
                        setSettingAwayId(r.id);
                        void postAwayReason(r.reason)
                          .then(() => {
                            setBreakSession({
                              awayReasonId: r.id,
                              reasonLabel: r.reason,
                            });
                            setPopoverOpen(false);
                            setPassword("");
                          })
                          .catch((e) => {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : "Unable to set away status.",
                            );
                          })
                          .finally(() => {
                            setSettingAwayId(null);
                          });
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-800 transition-colors cursor-pointer disabled:opacity-60",
                        BREAK_LIST_ITEM,
                      )}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                        aria-hidden
                      />
                      {settingAwayId === r.id ? "Setting…" : r.reason}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : (
          <span
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-sm font-medium text-emerald-900"
            title="No break options from server."
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white/80"
              aria-hidden
            />
            <span className="truncate">{ONLINE_META.label}</span>
          </span>
        )}
      </header>
    </>
  );
}
