"use client";

import Image from "next/image";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { FiFile, FiMic, FiPaperclip, FiSend, FiSmile, FiX } from "react-icons/fi";
import { ChatAudioRecorder } from "@/components/atoms/ChatAudioRecorder";
import { ChatVideoPlayer } from "@/components/atoms/ChatVideoPlayer";
import type { ComposerFilePreview } from "@/lib/chat/composerAttachments";
import {
  ACCEPTED_UPLOAD_TYPES,
  formatFileSize,
} from "@/lib/chat/composerAttachments";

interface ChatComposerProps {
  draft: string;
  showEmojiPicker: boolean;
  filePreviews: ComposerFilePreview[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  draftTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFilePreview: (id: string) => void;
  onToggleEmojiPicker: () => void;
  onHideEmojiPicker: () => void;
  onEmojiSelect: (emoji: { native: string }) => void;
  onVoiceRecordingComplete: (blob: Blob) => void;
  onRecorderOpenChange: (open: boolean) => void;
  onRecorderError: (msg: string) => void;
}

export function ChatComposer({
  draft,
  showEmojiPicker,
  filePreviews,
  fileInputRef,
  emojiPickerRef,
  draftTextareaRef,
  onDraftChange,
  onSubmit,
  onFileSelect,
  onRemoveFilePreview,
  onToggleEmojiPicker,
  onHideEmojiPicker,
  onEmojiSelect,
  onVoiceRecordingComplete,
  onRecorderOpenChange,
  onRecorderError,
}: ChatComposerProps) {
  return (
    <>
      {filePreviews.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {filePreviews.map((fp) => (
              <div
                key={fp.id}
                className="relative group bg-white border border-gray-200 rounded-lg p-2 flex items-center gap-2"
              >
                {fp.type === "audio" && fp.previewUrl ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                      <FiMic className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="rounded-md [color-scheme:light]">
                      <audio
                        src={fp.previewUrl}
                        controls
                        className="h-8 w-[120px] max-w-[120px]"
                        preload="metadata"
                      />
                    </div>
                  </div>
                ) : fp.type === "image" && fp.previewUrl ? (
                  <Image
                    src={fp.previewUrl}
                    alt={fp.file.name}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : fp.type === "video" && fp.previewUrl ? (
                  <div className="w-[100px] shrink-0">
                    <ChatVideoPlayer url={fp.previewUrl} maxWidth={100} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                    <FiFile className="w-5 h-5 text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                    {fp.file.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatFileSize(fp.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFilePreview(fp.id)}
                  className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-gray-200 px-2 py-3 sm:p-4">
        <form onSubmit={onSubmit}>
          <div className="flex min-w-0 items-end gap-1.5 sm:gap-2">
            <div className="flex min-h-[44px] min-w-0 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 transition-all focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_UPLOAD_TYPES}
                onChange={onFileSelect}
                className="hidden"
                id="file-upload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 cursor-pointer p-2 text-gray-400 transition-colors hover:text-gray-600 sm:p-3"
                title="Attach file"
              >
                <FiPaperclip className="h-5 w-5" />
              </button>

              <textarea
                ref={draftTextareaRef}
                rows={1}
                placeholder="Type your message..."
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onFocus={onHideEmojiPicker}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e);
                  }
                }}
                className="max-h-[150px] min-h-[44px] min-w-0 flex-1 resize-none border-none bg-transparent py-2.5 text-sm text-gray-700 outline-none focus:ring-0 sm:py-3"
              />

              <ChatAudioRecorder
                onRecordingComplete={onVoiceRecordingComplete}
                onOpenChange={onRecorderOpenChange}
                onError={onRecorderError}
              />

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={onToggleEmojiPicker}
                  className={
                    "relative z-10 cursor-pointer px-1 py-2 transition-colors sm:px-1.5 sm:py-3 " +
                    (showEmojiPicker
                      ? "text-brand-500"
                      : "text-gray-400 hover:text-gray-600")
                  }
                  title="Add emoji"
                >
                  <FiSmile className="h-5 w-5" />
                </button>

                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="fixed bottom-20 left-1/2 z-50 w-[calc(100vw-1rem)] max-w-[22rem] -translate-x-1/2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg sm:absolute sm:bottom-12 sm:left-auto sm:right-0 sm:w-[22rem] sm:translate-x-0"
                  >
                    <Picker
                      data={data}
                      onEmojiSelect={onEmojiSelect}
                      theme="light"
                      previewPosition="none"
                      skinTonePosition="none"
                      maxFrequentRows={2}
                      dynamicWidth={false}
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!draft.trim() && filePreviews.length === 0}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
