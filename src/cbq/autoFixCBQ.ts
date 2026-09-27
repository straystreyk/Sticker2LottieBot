import type { CallbackQueryMiddleware, Context } from "grammy";
import { InputFile } from "grammy";
import { gzipSync } from "node:zlib";
import { logConversion, logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import {
  autoFixLottieJson,
  inspectTelegramCompatibility,
  parseAndInspectLottie,
  replyWithTgsDocument,
} from "../logic/lottieFileToTgsSticker.js";
import {
  sendDonationPromptSafely,
  sendPostConversionMessages,
} from "../logic/resultActions.js";
import { autoFixStore } from "../store/autoFixStore.js";
import { resultStore } from "../store/resultStore.js";
import { recordSentResult } from "../logic/conversionHistory.js";

export const autoFixCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const userId = ctx.from.id;
  const pending = autoFixStore.get(userId);
  await ctx.answerCallbackQuery(tr(ctx, "Fixing…", "Исправляю…"));

  if (!pending) {
    return ctx.reply(
      tr(
        ctx,
        "This auto-fix request has expired. Send the file again.",
        "Запрос устарел. Отправьте файл ещё раз.",
      ),
    );
  }

  try {
    logProductEvent(userId, "autofix_accepted", {
      source_type: pending.sourceType,
    });
    const fixed = autoFixLottieJson(pending.jsonText);
    const { json, meta } = parseAndInspectLottie(fixed.jsonText);
    const tgs = gzipSync(Buffer.from(fixed.jsonText, "utf-8"), { level: 9 });
    const compatibility = inspectTelegramCompatibility(
      json,
      meta,
      tgs.byteLength,
    );

    if (!compatibility.canSendAsSticker) {
      await replyWithTgsDocument(
        ctx,
        tgs,
        tr(
          ctx,
          `Auto-fix could not resolve every restriction.\n${compatibility.warnings.join("\n")}`,
          `Автоисправление не смогло устранить все ограничения.\n${compatibility.warnings.join("\n")}`,
        ),
      );
      logProductEvent(userId, "autofix_incomplete", {
        warnings: compatibility.warnings,
      });
      await sendDonationPromptSafely(ctx);
      return;
    }

    const sent = await ctx.replyWithSticker(new InputFile(tgs, "sticker.tgs"));
    if (sent.sticker?.file_id) {
      resultStore.set(userId, { fileId: sent.sticker.file_id, emoji: "✨" });
    }
    recordSentResult({
      telegramUserId: userId,
      message: sent,
      sourceType: pending.sourceType,
      targetType: "tgs",
      fileName: "sticker.tgs",
      emoji: "✨",
    });
    autoFixStore.clear(userId);
    logConversion({
      telegramUserId: userId,
      sourceType: pending.sourceType,
      targetType: "tgs",
      success: true,
      outcome: "completed_with_warnings",
      errorMessage: fixed.changes.join("; "),
    });
    logProductEvent(userId, "autofix_completed", { changes: fixed.changes });
    await ctx.reply(
      tr(
        ctx,
        `Fixed automatically: ${fixed.changes.join(", ") || "JSON compacted"}.`,
        `Исправлено автоматически: ${fixed.changes.join(", ") || "JSON сжат"}.`,
      ),
    );
    await sendPostConversionMessages(ctx, { canAddToPack: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown auto-fix error";
    logProductEvent(userId, "autofix_failed", { error: message });
    return ctx.reply(
      tr(
        ctx,
        `Auto-fix failed: ${message}`,
        `Автоисправление не удалось: ${message}`,
      ),
    );
  }
};
