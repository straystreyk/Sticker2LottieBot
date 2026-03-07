import type { CallbackQueryMiddleware, Context } from "grammy";
import { isAdmin } from "../admin.js";
import { buildUsersPageText } from "../commands/users.js";

export const usersCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const userId = ctx.from?.id;
  if (!isAdmin(userId)) {
    await ctx.answerCallbackQuery({ text: "Admins only", show_alert: true });
    return;
  }

  const page = Number(ctx.match[1] ?? 1);
  const { text, keyboard } = buildUsersPageText(page);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(text, { reply_markup: keyboard });
};
