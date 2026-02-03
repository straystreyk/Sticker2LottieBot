import type { CallbackQueryMiddleware, Context } from "grammy";
import {convertFlowStore} from "../store/convertTypesStore.js";

const formatCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const format = ctx.match[1] as "lottie" | "json";
  const userId = ctx.from?.id;
  if (!userId) return;

  convertFlowStore.setFormat(userId, format);

  await ctx.answerCallbackQuery();
  await ctx.reply(`Selected output: ${format}. Now send the .tgs sticker (or custom emoji).`);
};

export { formatCBQ };
