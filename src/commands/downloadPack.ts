import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { tr } from "../i18n.js";

export const downloadPackCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const keyboard = new InlineKeyboard()
    .text(tr(ctx, "Original files", "Оригиналы"), "packdl:files")
    .row()
    .text("JSON", "packdl:json")
    .text("Lottie", "packdl:lottie");

  await ctx.reply(
    tr(ctx, "Choose the ZIP contents:", "Что положить в ZIP-архив?"),
    { reply_markup: keyboard },
  );
};
