import type { Context } from "grammy";
import { downloadPackStore } from "../store/downloadPackStore.js";

export const downloadPackCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  downloadPackStore.setAwaiting(userId);
  await ctx.reply(
    "Send a sticker pack name or link, for example: `TelegramAnimals` or `https://t.me/addstickers/TelegramAnimals`.",
    { parse_mode: "Markdown" },
  );
};
