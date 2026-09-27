import type { CallbackQueryMiddleware, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { downloadStickerSet } from "../logic/downloadStickerSet.js";
import { downloadPackStore, type PackOutputFormat } from "../store/downloadPackStore.js";

export const downloadPackChooseCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .text(tr(ctx, "Original files", "Оригиналы"), "packdl:files")
    .row()
    .text("JSON", "packdl:json")
    .text("Lottie", "packdl:lottie");
  return ctx.reply(tr(ctx, "Choose the ZIP contents:", "Что положить в ZIP-архив?"), {
    reply_markup: keyboard,
  });
};

export const downloadPackFormatCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const output = ctx.match[1] as PackOutputFormat;
  const userId = ctx.from.id;
  const pendingInput = downloadPackStore.takePendingInput(userId);
  logProductEvent(userId, "sticker_pack_format_selected", { output });
  await ctx.answerCallbackQuery();

  if (pendingInput) {
    await downloadStickerSet(ctx, pendingInput, output);
    return;
  }

  downloadPackStore.setAwaiting(userId, output);
  return ctx.reply(
    tr(
      ctx,
      "Send a sticker pack name or link, for example: TelegramAnimals or https://t.me/addstickers/TelegramAnimals",
      "Отправьте название или ссылку на стикерпак, например: TelegramAnimals или https://t.me/addstickers/TelegramAnimals",
    ),
  );
};

