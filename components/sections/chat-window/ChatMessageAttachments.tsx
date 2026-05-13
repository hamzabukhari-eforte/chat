"use client";

import Image from "next/image";
import {
  FaFileAlt,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaFileWord,
} from "react-icons/fa";
import { attachmentShouldRenderAsVideo } from "@/lib/chat/attachmentDisplay";
import { getFileBaseName, getFileExtension } from "@/lib/chat/composerAttachments";
import type { Attachment } from "@/lib/chat/types";
import { ChatVideoPlayer } from "@/components/atoms/ChatVideoPlayer";

function getFileIcon(ext: string, className: string) {
  switch (ext) {
    case "pdf":
      return <FaFilePdf className={className} />;
    case "doc":
    case "docx":
    case "rtf":
      return <FaFileWord className={className} />;
    case "xls":
    case "xlsx":
    case "xlsm":
      return <FaFileExcel className={className} />;
    case "csv":
      return <FaFileCsv className={className} />;
    case "txt":
      return <FaFileAlt className={className} />;
    default:
      return <FaFileAlt className={className} />;
  }
}

interface ChatMessageAttachmentsProps {
  attachments: Attachment[];
  align: "start" | "end";
  onPreviewImage: (url: string, name: string) => void;
  onDownloadAttachment: (att: Attachment) => void;
}

export function ChatMessageAttachments({
  attachments,
  align,
  onPreviewImage,
  onDownloadAttachment,
}: ChatMessageAttachmentsProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 mb-2 ${align === "end" ? "justify-end" : ""}`}
    >
      {attachments.map((att) => (
        <div key={att.id} className="relative shrink-0">
          {attachmentShouldRenderAsVideo(att) && att.url ? (
            <div
              className={`flex flex-col gap-1 ${align === "end" ? "items-end" : "items-start"}`}
            >
              <ChatVideoPlayer url={att.url} maxWidth={280} />
              <a
                href={att.url}
                download={getFileBaseName(att.name) || "video"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-600 hover:underline cursor-pointer max-w-[80vw] md:max-w-full"
              >
                Download
              </a>
            </div>
          ) : att.type === "image" && att.url ? (
            <button
              type="button"
              onClick={() => onPreviewImage(att.url!, att.name)}
              aria-label={`Preview image: ${att.name}`}
              className="cursor-pointer"
            >
              <div className="relative w-[200px] h-[150px]">
                <Image
                  src={att.url}
                  alt={att.name}
                  fill
                  unoptimized
                  className="rounded-lg object-cover hover:opacity-90 transition-opacity"
                />
              </div>
            </button>
          ) : att.type === "audio" && att.url ? (
            <div className="rounded-lg [color-scheme:light]">
              <audio
                src={att.url}
                controls
                className="max-w-[220px] rounded-md"
                preload="metadata"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onDownloadAttachment(att)}
              disabled={!att.url}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-md bg-gray-300 flex items-center justify-center shrink-0">
                {getFileIcon(getFileExtension(att.name), "w-5 h-5 text-gray-700")}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="text-sm font-medium truncate max-w-[180px]"
                  title={att.name}
                >
                  {getFileBaseName(att.name)}
                </span>
                {getFileExtension(att.name) && (
                  <span className="text-[10px] text-gray-500 uppercase leading-3">
                    {getFileExtension(att.name)}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
