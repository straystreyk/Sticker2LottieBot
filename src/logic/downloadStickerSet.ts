import type { Context } from "grammy";
import { InputFile } from "grammy";
import JSZip from "jszip";
import { getTelegramFileBuffer, sanitizeFileName } from "./downloadTelegramFile.js";
import { logConversion } from "../db/database.js";
import { sendDonationPrompt } from "./sendDonationPrompt.js";

const extractSetName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const linkMatch = trimmed.match(/addstickers\/([a-zA-Z0-9_]+)/i);
  if (linkMatch) return linkMatch[1];

  const directMatch = trimmed.match(/^([a-zA-Z0-9_]+)$/);
  return directMatch?.[1] ?? null;
};

const getStickerExtension = (sticker: {
  is_animated?: boolean;
  is_video?: boolean;
}) => {
  if (sticker.is_animated) return "tgs";
  if (sticker.is_video) return "webm";
  return "webp";
};

const shouldReportProgress = (processed: number, total: number) => {
  if (processed === total) return true;
  if (processed === 1) return true;
  if (total <= 10) return true;
  return processed % 5 === 0;
};

export const downloadStickerSet = async (ctx: Context, rawInput: string) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const setName = extractSetName(rawInput);
  if (!setName) {
    await ctx.reply("Unable to parse sticker pack name. Send `ShortName` or a `t.me/addstickers/...` link.");
    return;
  }

  try {
    const stickerSet = await ctx.api.getStickerSet(setName);

    if (!stickerSet.stickers.length) {
      await ctx.reply("This sticker pack is empty.");
      return;
    }

    const progressMessage = await ctx.reply(
      `Preparing ZIP archive for ${stickerSet.stickers.length} stickers from pack \`${setName}\`.\nProgress: 0/${stickerSet.stickers.length}`,
      {
      parse_mode: "Markdown",
      },
    );

    const zip = new JSZip();
    const total = stickerSet.stickers.length;

    for (let index = 0; index < total; index += 1) {
      const sticker = stickerSet.stickers[index];
      const extension = getStickerExtension(sticker);
      const fileName = sanitizeFileName(`${setName}_${index + 1}.${extension}`);
      const { buffer } = await getTelegramFileBuffer(ctx, sticker.file_id);
      zip.file(fileName, buffer);

      const processed = index + 1;
      if (shouldReportProgress(processed, total)) {
        await ctx.api.editMessageText(
          progressMessage.chat.id,
          progressMessage.message_id,
          `Preparing ZIP archive for ${total} stickers from pack \`${setName}\`.\nProgress: ${processed}/${total}`,
          { parse_mode: "Markdown" },
        );
      }
    }

    await ctx.api.editMessageText(
      progressMessage.chat.id,
      progressMessage.message_id,
      `Packing ZIP archive for pack \`${setName}\`.\nDownloaded: ${total}/${total}`,
      { parse_mode: "Markdown" },
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    await ctx.replyWithDocument(new InputFile(zipBuffer, `${setName}.zip`), {
      caption: `Sticker pack: ${setName}`,
    });

    await ctx.api.editMessageText(
      progressMessage.chat.id,
      progressMessage.message_id,
      `Archive for pack \`${setName}\` is ready.\nSent ${total} stickers in one ZIP.`,
      { parse_mode: "Markdown" },
    );

    logConversion({
      telegramUserId: userId,
      sourceType: "sticker_pack",
      targetType: "files",
      success: true,
    });

    await sendDonationPrompt(ctx);
  } catch (error) {
    console.error(error);
    logConversion({
      telegramUserId: userId,
      sourceType: "sticker_pack",
      targetType: "files",
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown sticker pack download error",
    });
    await ctx.reply("Unable to download this sticker pack. Check the name/link and try again.");
  }
};
