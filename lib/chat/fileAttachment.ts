/** True for video files we preview in chat (mp4, mov, etc.). */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|mov|m4v)$/i.test(file.name);
}

/**
 * Recorded voice blob filename — extension must match MIME (Safari often emits `audio/mp4`, not webm).
 */
export function voiceClipFileNameForBlob(blob: Blob): string {
  const t = (blob.type || "").toLowerCase();
  const stamp = Date.now();
  if (t.includes("webm")) return `voice-message-${stamp}.webm`;
  if (t.includes("ogg")) return `voice-message-${stamp}.ogg`;
  if (t.includes("mpeg") || t.includes("mp3")) return `voice-message-${stamp}.mp3`;
  if (t.includes("mp4") || t.includes("aac") || t.includes("m4a")) {
    return `voice-message-${stamp}.m4a`;
  }
  if (t.includes("wav")) return `voice-message-${stamp}.wav`;
  return `voice-message-${stamp}.webm`;
}
