import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import zlib from "node:zlib";
import { Context, InlineKeyboard, InputFile } from "grammy";
import JSZip from "jszip";
import { CONFIG } from "../config.js";
import { convertFlowStore, type Tgs2LottieFormat } from "../store/convertTypesStore.js";
import { getUserPreferences, logConversion, logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { sendPostConversionMessages } from "./resultActions.js";
import { recordSentResult } from "./conversionHistory.js";

function buildCaption(base: string, lottieJSON: string) {
  try {
    const lottie = JSON.parse(lottieJSON);

    const w = typeof lottie?.w === "number" ? lottie.w : "?";
    const h = typeof lottie?.h === "number" ? lottie.h : "?";
    const fr = typeof lottie?.fr === "number" ? lottie.fr : "?";
    const ip = typeof lottie?.ip === "number" ? lottie.ip : undefined;
    const op = typeof lottie?.op === "number" ? lottie.op : undefined;
    const layers = Array.isArray(lottie?.layers) ? lottie.layers.length : "?";

    let duration = "?";
    if (typeof fr === "number" && typeof ip === "number" && typeof op === "number" && fr > 0) {
      duration = `${Math.max(0, (op - ip) / fr).toFixed(2)}s`;
    }

    const warnings: string[] = [];
    if (w !== 512 || h !== 512) warnings.push(`canvas ${w}×${h}`);
    if (typeof fr === "number" && fr > 60) warnings.push(`fps ${fr}`);
    // можно добавить duration warning если хочешь

    const infoLines = [
      `📊 ${w}×${h}, ${fr}fps, ${duration}, layers: ${layers}`,
      warnings.length ? `⚠️ ${warnings.join(", ")}` : null,
    ].filter(Boolean);

    const caption = [base, ...infoLines].join("\n");
    return caption.length > 1024 ? caption.slice(0, 1020) + "…" : caption;
  } catch {
    return base; // если JSON не парсится — просто базовый caption
  }
}
export const stickerToFile = async (ctx: Context, fileId?: string) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.reply(tr(ctx, "Unable to identify the user.", "Не удалось определить пользователя."));

  const state = convertFlowStore.get(userId);
  let format: Tgs2LottieFormat | undefined = state?.mode === "tgs2lottie" ? state.format : undefined;
  format ??= getUserPreferences(userId).defaultOutputFormat ?? undefined;

  if (!format) {
    if (fileId) convertFlowStore.setPendingSticker(userId, fileId);
    logProductEvent(userId, "format_prompt_shown", { source_type: "tgs" });
    const keyboard = new InlineKeyboard()
      .text(".lottie", "format:lottie")
      .text(".json", "format:json");
    return ctx.reply(
      tr(
        ctx,
        "Which format should I use? I will remember your choice for future stickers.",
        "В какой формат конвертировать? Я запомню выбор для следующих стикеров.",
      ),
      { reply_markup: keyboard },
    );
  }

  const targetType = format === "json" ? "json" : "lottie";

  if (!fileId) return ctx.reply(tr(ctx, "Sticker file is missing.", "Файл стикера отсутствует."));

  const file = await ctx.api.getFile(fileId);
  const filePath = file.file_path;
  if (!filePath) return ctx.reply(tr(ctx, "Unable to download the Telegram file.", "Не удалось скачать файл из Telegram."));

  const downloadUrl = `https://api.telegram.org/file/bot${CONFIG.botToken}/${filePath}`;

  try {
    logProductEvent(userId, "conversion_started", { source_type: "tgs", target_type: targetType });
    const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) return ctx.reply(tr(ctx, "Unable to determine the file format.", "Не удалось определить формат файла."));

    if (fileType.ext !== "gz") {
      return ctx.reply(tr(ctx, "Only animated TGS stickers are supported here.", "Здесь поддерживаются только анимированные TGS-стикеры."));
    }

    const unzippedBuffer = zlib.gunzipSync(buffer);
    const lottieJSON = unzippedBuffer.toString("utf-8");



    if (format === "json") {
      const caption = buildCaption("📄 Here is your .json file", lottieJSON);

      const sent = await ctx.replyWithDocument(new InputFile(Buffer.from(lottieJSON), "sticker.json"), {
        caption,
      });
      recordSentResult({
        telegramUserId: userId,
        message: sent,
        sourceType: "tgs",
        targetType: "json",
        fileName: "sticker.json",
      });
    } else {
      const zip = new JSZip();
      zip.file("animations/animation.json", lottieJSON);

      const manifest = {
        version: "2.0",
        author: "@MasterSaya",
        animations: [{ id: "animation", path: "animations/animation.json" }],
      };

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const lottieBuffer = await zip.generateAsync({ type: "nodebuffer" });

      const caption = buildCaption("🎉 Here is your .lottie file (v2)", lottieJSON);

      const sent = await ctx.replyWithDocument(new InputFile(lottieBuffer, "sticker.lottie"), {
        caption,
      });
      recordSentResult({
        telegramUserId: userId,
        message: sent,
        sourceType: "tgs",
        targetType: "lottie",
        fileName: "sticker.lottie",
      });
    }

    logConversion({
      telegramUserId: userId,
      sourceType: "tgs",
      targetType,
      success: true,
    });

    logProductEvent(userId, "conversion_completed", {
      source_type: "tgs",
      target_type: targetType,
      telegram_compatible: true,
    });

    await sendPostConversionMessages(ctx);
  } catch (e) {
    console.error(e);
    logConversion({
      telegramUserId: userId,
      sourceType: "tgs",
      targetType,
      success: false,
      errorMessage: e instanceof Error ? e.message : "Unknown processing error",
    });
    logProductEvent(userId, "conversion_failed", {
      source_type: "tgs",
      target_type: targetType,
      error: e instanceof Error ? e.message : "Unknown processing error",
    });
    return ctx.reply(tr(ctx, "There was an error processing the sticker.", "При обработке стикера произошла ошибка."));
  }
};
