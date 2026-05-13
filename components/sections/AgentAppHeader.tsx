"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiArrowLeft } from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AwayReasonOption } from "@/lib/chat/types";
import { BreakAwayModal } from "./agent-header/BreakAwayModal";
import { AwayStatusControl } from "./agent-header/AwayStatusControl";

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
  /**
   * When true, the header back control returns to the inbox (queue / my chats)
   * instead of browser history — used on narrow viewports when a chat is open.
   */
  preferInboxNavOnBack?: boolean;
  /** Required when `preferInboxNavOnBack` is used; opens the inbox pane. */
  onBackToInbox?: () => void;
};

export function AgentAppHeader({
  agentName: _agentName,
  awayReasons = [],
  preferInboxNavOnBack = false,
  onBackToInbox,
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
    if (preferInboxNavOnBack && onBackToInbox) {
      onBackToInbox();
      return;
    }
    router.back();
  }, [preferInboxNavOnBack, onBackToInbox, router]);

  const backAriaLabel =
    preferInboxNavOnBack && onBackToInbox
      ? "Back to queue and my chats"
      : "Go back";

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
        <BreakAwayModal
          reasonLabel={breakSession.reasonLabel}
          password={password}
          submitting={submitting}
          onPasswordChange={setPassword}
          onSubmit={() => void handleImBack()}
        />,
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
            aria-label={backAriaLabel}
            disabled={onBreak}
            className="shrink-0 border-gray-200 text-gray-700 hover:bg-gray-50 h-8 disabled:pointer-events-none disabled:opacity-40"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <AwayStatusControl
          awayReasons={awayReasons}
          popoverOpen={popoverOpen}
          onBreak={onBreak}
          settingAwayId={settingAwayId}
          onPopoverOpenChange={setPopoverOpen}
          onSelectAwayReason={(reason) => {
            setSettingAwayId(reason.id);
            void postAwayReason(reason.reason)
              .then(() => {
                setBreakSession({
                  awayReasonId: reason.id,
                  reasonLabel: reason.reason,
                });
                setPopoverOpen(false);
                setPassword("");
              })
              .catch((e) => {
                toast.error(
                  e instanceof Error ? e.message : "Unable to set away status.",
                );
              })
              .finally(() => {
                setSettingAwayId(null);
              });
          }}
        />
      </header>
    </>
  );
}
