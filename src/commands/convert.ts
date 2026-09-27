import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { tr } from "../i18n.js";

export const convertCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const kb = new InlineKeyboard()
      .text(".lottie", "format:lottie")
      .text(".json", "format:json");

  await ctx.reply(
    tr(
      ctx,
      "Choose the default output for animated TGS stickers. JSON, Lottie and SVG files are converted to TGS automatically.",
      "Выберите формат по умолчанию для анимированных TGS-стикеров. JSON, Lottie и SVG конвертируются в TGS автоматически.",
    ),
    { reply_markup: kb },
  );
};
