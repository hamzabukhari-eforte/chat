/** Binary chunk size when uploading files over WebSocket (64 KiB). */
export const FILE_CHUNK_SIZE_BYTES = 64 * 1024;

export function chunkCountForFileSize(size: number): number {
  if (size <= 0) return 1;
  return Math.ceil(size / FILE_CHUNK_SIZE_BYTES);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Reads one chunk of `file` as raw base64 (no `data:` prefix). */
export async function readFileChunkAsBase64(
  file: File,
  chunkIndex: number,
  chunkSize: number,
): Promise<string> {
  const start = chunkIndex * chunkSize;
  if (start >= file.size) return "";
  const end = Math.min(start + chunkSize, file.size);
  const slice = file.slice(start, end);
  const buf = await slice.arrayBuffer();
  return uint8ToBase64(new Uint8Array(buf));
}
