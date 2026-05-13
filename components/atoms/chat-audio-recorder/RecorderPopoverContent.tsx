"use client";

import { FiCheck, FiMic, FiSquare, FiTrash2 } from "react-icons/fi";

type Phase = "ready" | "recording" | "review";

interface RecorderPopoverContentProps {
  phase: Phase;
  seconds: number;
  reviewUrl: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDiscardReview: () => void;
  onSaveReview: () => void;
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RecorderPopoverContent({
  phase,
  seconds,
  reviewUrl,
  onStartRecording,
  onStopRecording,
  onDiscardReview,
  onSaveReview,
}: RecorderPopoverContentProps) {
  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100vw-1rem)] max-w-[22rem] -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg sm:absolute sm:bottom-full sm:left-auto sm:right-0 sm:mb-2 sm:w-[min(100vw-2rem,280px)] sm:max-w-[280px] sm:translate-x-0">
      {phase === "ready" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">Record a voice message</p>
          <button
            type="button"
            onClick={onStartRecording}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700 cursor-pointer"
          >
            <FiMic className="h-4 w-4" />
            Start recording
          </button>
        </div>
      )}

      {phase === "recording" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm text-gray-700">
              {formatTimer(seconds)}
            </span>
            <span className="text-xs text-red-600">Recording…</span>
          </div>
          <button
            type="button"
            onClick={onStopRecording}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <FiSquare className="h-4 w-4" />
            Stop
          </button>
        </div>
      )}

      {phase === "review" && reviewUrl && (
        <div className="flex flex-col gap-3">
          <div className="rounded-md [color-scheme:light]">
            <audio
              src={reviewUrl}
              controls
              className="w-full max-w-full rounded-md"
              preload="metadata"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDiscardReview}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
            >
              <FiTrash2 className="h-4 w-4" />
              Discard
            </button>
            <button
              type="button"
              onClick={onSaveReview}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700 cursor-pointer"
            >
              <FiCheck className="h-4 w-4" />
              Use clip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
