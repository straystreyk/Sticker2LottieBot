import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import {convertFlowStore} from "../store/convertTypesStore.js";

export const convertCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Можно сбрасывать прошлый выбор при новом /convert
  convertFlowStore.clear(userId);

  const kb = new InlineKeyboard()
      .text("TGS → Lottie", "mode:tgs2lottie")
      .row()
      .text("Lottie → TGS", "mode:lottie2tgs");

  await ctx.reply("What do you want to convert?", { reply_markup: kb });
};
