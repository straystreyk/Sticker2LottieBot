import type { Context } from "grammy";
import { InputFile } from "grammy";

export const TGS_DOCUMENT_FILE_NAME = "sticker.tgs";

let lastUploadNonce = 0;

function nextUploadNonce(): number {
  const now = Date.now() >>> 0;
  lastUploadNonce = now === lastUploadNonce ? (lastUploadNonce + 1) >>> 0 : now;
  return lastUploadNonce;
}

/**
 * Telegram may reuse metadata from an earlier upload when the file bytes are
 * identical. If that first upload had no usable name, later uploads can keep
 * appearing as `Unknown.file` even when multipart contains `sticker.tgs`.
 *
 * The gzip MTIME field is metadata only, so changing it gives Telegram a fresh
 * upload without changing the decompressed Lottie JSON.
 */
export function prepareTgsDocumentUpload(
  tgs: Buffer,
  nonce = nextUploadNonce(),
): Buffer {
  const upload = Buffer.from(tgs);
  const isGzip =
    upload.length >= 10 &&
    upload[0] === 0x1f &&
    upload[1] === 0x8b &&
    upload[2] === 0x08;

  if (isGzip) {
    upload.writeUInt32LE(nonce >>> 0, 4);
  }

  return upload;
}

export async function replyWithTgsDocument(
  ctx: Context,
  tgs: Buffer,
  caption: string,
) {
  return ctx.replyWithDocument(
    new InputFile(prepareTgsDocumentUpload(tgs), TGS_DOCUMENT_FILE_NAME),
    {
      caption,
    },
  );
}
