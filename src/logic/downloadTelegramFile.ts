import axios from "axios";
import type { Context } from "grammy";
import { InputFile } from "grammy";
import { CONFIG } from "../config.js";

const getTelegramFileBuffer = async (ctx: Context, fileId: string) => {
  const file = await ctx.api.getFile(fileId);
  const filePath = file.file_path;

  if (!filePath) {
    throw new Error("Unable to resolve telegram file path.");
  }

  const downloadUrl = `https://api.telegram.org/file/bot${CONFIG.botToken}/${filePath}`;
  const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });

  return {
    buffer: Buffer.from(response.data),
    filePath,
  };
};

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "_");

export const downloadTelegramFile = async (
  ctx: Context,
  fileId: string,
  fileName: string,
  caption?: string,
) => {
  const { buffer } = await getTelegramFileBuffer(ctx, fileId);
  await ctx.replyWithDocument(new InputFile(buffer, sanitizeFileName(fileName)), {
    caption,
  });
};

export { getTelegramFileBuffer, sanitizeFileName };
