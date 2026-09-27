import type { Context } from "grammy";
import { InputFile } from "grammy";
import JSZip from "jszip";
import { gunzipSync } from "node:zlib";
import {
  getTelegramFileBuffer,
  sanitizeFileName,
} from "./downloadTelegramFile.js";
import { logConversion, logProductEvent } from "../db/database.js";
import type { PackOutputFormat } from "../store/downloadPackStore.js";
import { tr } from "../i18n.js";
import { sendDonationPromptSafely } from "./resultActions.js";
import { recordSentResult } from "./conversionHistory.js";

const extractSetName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const linkMatch = trimmed.match(/(?:addstickers|addemoji)\/([a-zA-Z0-9_]+)/i);
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

async function jsonToLottieBuffer(jsonText: string) {
  const lottieZip = new JSZip();
  lottieZip.file("animations/animation.json", jsonText);
  lottieZip.file(
    "manifest.json",
    JSON.stringify({
      version: "2.0",
      author: "@MasterSaya",
      animations: [{ id: "animation", path: "animations/animation.json" }],
    }),
  );
  return lottieZip.generateAsync({ type: "nodebuffer" });
}

export const downloadStickerSet = async (
  ctx: Context,
  rawInput: string,
  output: PackOutputFormat = "files",
) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const setName = extractSetName(rawInput);
  if (!setName) {
    await ctx.reply(
      tr(
        ctx,
        "Unable to parse the pack name. Send ShortName or a t.me/addstickers/... link.",
        "Не удалось определить название пака. Отправьте ShortName или ссылку t.me/addstickers/...",
      ),
    );
    return;
  }

  try {
    const stickerSet = await ctx.api.getStickerSet(setName);

    if (!stickerSet.stickers.length) {
      await ctx.reply(
        tr(ctx, "This sticker pack is empty.", "Этот стикерпак пуст."),
      );
      return;
    }

    const progressMessage = await ctx.reply(
      tr(
        ctx,
        `Preparing ZIP archive for ${stickerSet.stickers.length} stickers from pack \`${setName}\`.\nProgress: 0/${stickerSet.stickers.length}`,
        `Готовлю ZIP для ${stickerSet.stickers.length} стикеров из пака \`${setName}\`.\nПрогресс: 0/${stickerSet.stickers.length}`,
      ),
      {
        parse_mode: "Markdown",
      },
    );

    logProductEvent(userId, "sticker_pack_processing_started", {
      set_name: setName,
      output,
    });
    const zip = new JSZip();
    const total = stickerSet.stickers.length;
    let included = 0;
    let skipped = 0;

    for (let index = 0; index < total; index += 1) {
      const sticker = stickerSet.stickers[index];
      const { buffer } = await getTelegramFileBuffer(ctx, sticker.file_id);
      if (output === "files") {
        const extension = getStickerExtension(sticker);
        const fileName = sanitizeFileName(
          `${setName}_${index + 1}.${extension}`,
        );
        zip.file(fileName, buffer);
        included += 1;
      } else if (sticker.is_animated) {
        const jsonText = gunzipSync(buffer).toString("utf-8");
        if (output === "json") {
          zip.file(sanitizeFileName(`${setName}_${index + 1}.json`), jsonText);
        } else {
          zip.file(
            sanitizeFileName(`${setName}_${index + 1}.lottie`),
            await jsonToLottieBuffer(jsonText),
          );
        }
        included += 1;
      } else {
        skipped += 1;
      }

      const processed = index + 1;
      if (shouldReportProgress(processed, total)) {
        await ctx.api.editMessageText(
          progressMessage.chat.id,
          progressMessage.message_id,
          tr(
            ctx,
            `Preparing ZIP archive for ${total} stickers from pack \`${setName}\`.\nProgress: ${processed}/${total}`,
            `Готовлю ZIP для ${total} стикеров из пака \`${setName}\`.\nПрогресс: ${processed}/${total}`,
          ),
          { parse_mode: "Markdown" },
        );
      }
    }

    await ctx.api.editMessageText(
      progressMessage.chat.id,
      progressMessage.message_id,
      tr(
        ctx,
        `Packing ZIP archive for pack \`${setName}\`.\nDownloaded: ${total}/${total}`,
        `Собираю ZIP для пака \`${setName}\`.\nЗагружено: ${total}/${total}`,
      ),
      { parse_mode: "Markdown" },
    );

    if (included === 0) {
      await ctx.reply(
        tr(
          ctx,
          "This pack has no animated TGS stickers to convert.",
          "В этом паке нет анимированных TGS-стикеров для конвертации.",
        ),
      );
      return;
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const sentArchive = await ctx.replyWithDocument(
      new InputFile(zipBuffer, `${setName}.zip`),
      {
        caption: tr(
          ctx,
          `Sticker pack: ${setName}\nIncluded: ${included}${skipped ? ` · Skipped non-TGS: ${skipped}` : ""}`,
          `Стикерпак: ${setName}\nДобавлено: ${included}${skipped ? ` · Пропущено не-TGS: ${skipped}` : ""}`,
        ),
      },
    );
    recordSentResult({
      telegramUserId: userId,
      message: sentArchive,
      sourceType: "sticker_pack",
      targetType: output,
      fileName: `${setName}.zip`,
    });

    await ctx.api.editMessageText(
      progressMessage.chat.id,
      progressMessage.message_id,
      tr(
        ctx,
        `Archive for pack \`${setName}\` is ready.\nIncluded ${included} files in one ZIP.`,
        `Архив пака \`${setName}\` готов.\nВ один ZIP добавлено ${included} файлов.`,
      ),
      { parse_mode: "Markdown" },
    );

    logConversion({
      telegramUserId: userId,
      sourceType: "sticker_pack",
      targetType: output,
      success: true,
    });
    logProductEvent(userId, "sticker_pack_processing_completed", {
      set_name: setName,
      output,
      included,
      skipped,
    });

    await sendDonationPromptSafely(ctx);
  } catch (error) {
    console.error(error);
    logConversion({
      telegramUserId: userId,
      sourceType: "sticker_pack",
      targetType: output,
      success: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown sticker pack download error",
    });
    await ctx.reply(
      tr(
        ctx,
        "Unable to download this sticker pack. Check the name/link and try again.",
        "Не удалось скачать стикерпак. Проверьте название или ссылку и попробуйте снова.",
      ),
    );
  }
};
