/** True for video files we preview in chat (mp4, mov, etc.). */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|mov|m4v)$/i.test(file.name);
}
