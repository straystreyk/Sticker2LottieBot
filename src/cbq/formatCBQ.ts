import { convertTypesStore } from "../store/convertTypesStore.js";
import { CallbackQueryMiddleware, Context } from "grammy";

const formatCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const format = ctx.match[1] as "lottie" | "json";
  const userId = ctx.from.id;

  convertTypesStore.set(userId, format);
  await ctx.answerCallbackQuery();
  await ctx.reply(`The ${format} format is selected. Now send the sticker.`);
};

export { formatCBQ };
