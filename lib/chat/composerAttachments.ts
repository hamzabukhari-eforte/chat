import type { Attachment } from "./types";
import { isVideoFile } from "./fileAttachment";

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";
export const ACCEPTED_VIDEO_TYPES = "video/mp4,video/quicktime,video/webm";
export const ACCEPTED_DOC_TYPES = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv";
export const ACCEPTED_UPLOAD_TYPES = `${ACCEPTED_IMAGE_TYPES},${ACCEPTED_VIDEO_TYPES},${ACCEPTED_DOC_TYPES}`;

export interface ComposerFilePreview {
  id: string;
  file: File;
  type: "image" | "video" | "document" | "audio";
  previewUrl?: string;
}

function createPreviewId(): string {
  return Math.random().toString(36).slice(2);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileBaseName(fullName: string): string {
  const n = (fullName || "").trim();
  if (!n) return "";
  const parts = n.split(/[\\/]/);
  return parts[parts.length - 1] || n;
}

export function getFileExtension(fullName: string): string {
  const base = getFileBaseName(fullName).toLowerCase();
  const m = /\.([a-z0-9]+)$/i.exec(base);
  return m?.[1] ?? "";
}

export function revokeBlobPreviewUrl(url: string | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export async function createFilePreview(file: File): Promise<ComposerFilePreview> {
  const isImage = file.type.startsWith("image/");
  const isVideo = isVideoFile(file);
  const isAudio = file.type.startsWith("audio/");
  const preview: ComposerFilePreview = {
    id: createPreviewId(),
    file,
    type: isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : "document",
  };

  if (isImage || isVideo) {
    preview.previewUrl = await fileToDataUrl(file);
  } else {
    preview.previewUrl = URL.createObjectURL(file);
  }

  return preview;
}

export function previewsToAttachments(previews: ComposerFilePreview[]): Attachment[] {
  return previews.map((preview) => ({
    id: preview.id,
    type: preview.type,
    name: preview.file.name,
    url: preview.previewUrl || "",
    size: preview.file.size,
    mimeType: preview.file.type,
  }));
}
