"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiMic, FiSquare, FiTrash2 } from "react-icons/fi";

export interface ChatAudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onOpenChange?: (open: boolean) => void;
  /** Mic denied, unsupported APIs, or empty recording */
  onError?: (message: string) => void;
  disabled?: boolean;
}

type Phase = "ready" | "recording" | "review";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/aac",
    "video/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChatAudioRecorderInner({
  onRecordingComplete,
  onOpenChange,
  onError,
  disabled = false,
}: ChatAudioRecorderProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [seconds, setSeconds] = useState(0);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipReviewRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const revokeReview = useCallback(() => {
    if (reviewUrl) {
      URL.revokeObjectURL(reviewUrl);
    }
    setReviewUrl(null);
    setReviewBlob(null);
  }, [reviewUrl]);

  const closePopover = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      skipReviewRef.current = true;
      mr.stop();
      // stream / timer / ref cleared in recorder.onstop
    } else {
      clearTimer();
      stopStream();
      mediaRecorderRef.current = null;
      chunksRef.current = [];
    }
    revokeReview();
    setPhase("ready");
    setSeconds(0);
    setOpen(false);
    onOpenChange?.(false);
  }, [clearTimer, stopStream, revokeReview, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const el = wrapperRef.current;
      if (el && !el.contains(event.target as Node)) {
        closePopover();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, closePopover]);

  const startRecording = async () => {
    if (typeof window === "undefined") {
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      onError?.("Voice recording is not supported in this browser.");
      return;
    }
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      onError?.(
        "Microphone is unavailable. Open the app over HTTPS (or localhost) and use a modern browser.",
      );
      return;
    }
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime = pickMimeType();
      mimeTypeRef.current = mime || "audio/webm";

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(
          stream,
          mime ? { mimeType: mime } : undefined,
        );
      } catch {
        recorder = new MediaRecorder(stream);
        mimeTypeRef.current = recorder.mimeType || "audio/webm";
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopStream();
        mediaRecorderRef.current = null;
        clearTimer();

        if (skipReviewRef.current) {
          skipReviewRef.current = false;
          chunksRef.current = [];
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || "audio/webm",
        });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        setReviewBlob(blob);
        setReviewUrl(url);
        setPhase("review");
      };

      recorder.start(250);
      setPhase("recording");
      setSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission denied."
          : e instanceof Error
            ? e.message
            : "Could not access the microphone.";
      onError?.(msg);
      closePopover();
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      skipReviewRef.current = false;
      mr.stop();
    }
  };

  const discardReview = () => {
    revokeReview();
    setPhase("ready");
    setSeconds(0);
  };

  const saveReview = () => {
    if (!reviewBlob) return;
    if (reviewBlob.size === 0) {
      onError?.("Recording was empty. Try again.");
      return;
    }
    onRecordingComplete(reviewBlob);
    revokeReview();
    setPhase("ready");
    setSeconds(0);
    setOpen(false);
    onOpenChange?.(false);
  };

  const toggleOpen = () => {
    if (open) {
      closePopover();
    } else {
      setOpen(true);
      onOpenChange?.(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={
          "py-3 px-1.5 transition-colors cursor-pointer " +
          (open
            ? "text-brand-500"
            : "text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed")
        }
        title="Record voice message"
        aria-expanded={open}
        aria-label="Record voice message"
      >
        <FiMic className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-50 w-[min(100vw-2rem,280px)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          {phase === "ready" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">Record a voice message</p>
              <button
                type="button"
                onClick={startRecording}
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
                onClick={stopRecording}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-50 cursor-pointer"
              >
                <FiSquare className="h-4 w-4" />
                Stop
              </button>
            </div>
          )}

          {phase === "review" && reviewUrl && (
            <div className="flex flex-col gap-3">
              <audio
                src={reviewUrl}
                controls
                className="w-full max-w-full rounded-md"
                preload="metadata"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={discardReview}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Discard
                </button>
                <button
                  type="button"
                  onClick={saveReview}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700 cursor-pointer"
                >
                  <FiCheck className="h-4 w-4" />
                  Use clip
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
