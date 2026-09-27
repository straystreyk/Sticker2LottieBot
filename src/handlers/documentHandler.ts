// handlers/documentHandler.ts
import type { Context } from "grammy";
import { convertFlowStore } from "../store/convertTypesStore.js";
import { lottieFileToTgsSticker } from "../logic/lottieFileToTgsSticker.js";
import { svgFileToTgsSticker } from "../logic/svgFileToTgsSticker.js";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { doctorStore } from "../store/doctorStore.js";
import { diagnoseDocument } from "../logic/stickerDoctor.js";

export const documentHandler = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const doc = ctx.message?.document;
  if (!doc?.file_id)
    return ctx.reply(tr(ctx, "No file found.", "Файл не найден."));

  if (doctorStore.take(userId)) {
    try {
      await diagnoseDocument(ctx);
    } catch (error) {
      await ctx.reply(
        tr(
          ctx,
          `Sticker Doctor could not inspect this file: ${error instanceof Error ? error.message : "unknown error"}`,
          `Sticker Doctor не смог проверить файл: ${error instanceof Error ? error.message : "неизвестная ошибка"}`,
        ),
      );
    }
    return;
  }

  const fileName = doc.file_name?.toLowerCase() ?? "";
  const isJson = fileName.endsWith(".json");
  const isLottie = fileName.endsWith(".lottie");
  const isSvg = fileName.endsWith(".svg");

  if (!isJson && !isLottie && !isSvg) {
    return ctx.reply(
      tr(
        ctx,
        "Please send a Lottie file as .json / .lottie, or an SVG file as .svg.",
        "Отправьте Lottie-файл .json / .lottie или SVG-файл .svg.",
      ),
    );
  }

  logProductEvent(userId, "file_received", {
    source_type: isSvg ? "svg" : isLottie ? "lottie" : "json",
    file_name: doc.file_name ?? null,
  });

  if (isSvg) {
    try {
      await svgFileToTgsSticker(ctx, doc.file_id);
    } catch (error) {
      await ctx.reply(
        tr(
          ctx,
          "I could not convert this SVG. Try simplifying text, masks, filters, images or gradients.",
          "Не удалось конвертировать SVG. Попробуйте убрать текст, маски, фильтры, изображения или градиенты.",
        ),
      );
    }
    return;
  }

  convertFlowStore.setMode(userId, "lottie2tgs");

  try {
    await lottieFileToTgsSticker(ctx, doc.file_id);
  } catch (error) {
    await ctx.reply(
      tr(
        ctx,
        "I could not convert this file. Check that it contains a valid Lottie animation.",
        "Не удалось конвертировать файл. Проверьте, что внутри находится корректная Lottie-анимация.",
      ),
    );
  }
};
