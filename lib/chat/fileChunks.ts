/**
 * Raw bytes per `File` slice for binary WebSocket chunks.
 */
export const FILE_CHUNK_SIZE_BYTES = 64 * 1024;

export function chunkCountForFileSize(size: number): number {
  if (size <= 0) return 1;
  return Math.ceil(size / FILE_CHUNK_SIZE_BYTES);
}

/** Chunk count for binary WebSocket frames (empty file → 0 chunks). */
export function binaryChunkCountForFileSize(size: number): number {
  if (size <= 0) return 0;
  return Math.ceil(size / FILE_CHUNK_SIZE_BYTES);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Base64 without `data:*;base64,` prefix — FileReader handles binary edge cases reliably. */
function blobToRawBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        console.warn("[ws-file] FileReader result not string", {
          resultType: typeof r,
        });
        resolve("");
        return;
      }
      const comma = r.indexOf(",");
      resolve(comma >= 0 ? r.slice(comma + 1) : r);
    };
    reader.onerror = () => {
      console.error("[ws-file] FileReader.onerror", reader.error);
      reject(reader.error ?? new Error("FileReader failed"));
    };
    reader.readAsDataURL(blob);
  });
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
  if (slice.size === 0) return "";
  try {
    const b64 = await blobToRawBase64(slice);
    if (b64.length === 0 && slice.size > 0) {
      console.warn("[ws-file] readFileChunkAsBase64: empty base64 for non-empty slice", {
        fileName: file.name,
        chunkIndex,
        sliceSize: slice.size,
        start,
        end,
      });
    }
    return b64;
  } catch (e) {
    console.warn("[ws-file] blobToRawBase64 failed, using arrayBuffer fallback", {
      fileName: file.name,
      chunkIndex,
      sliceSize: slice.size,
      error: e,
    });
    const buf = await slice.arrayBuffer();
    return uint8ToBase64(new Uint8Array(buf));
  }
}
