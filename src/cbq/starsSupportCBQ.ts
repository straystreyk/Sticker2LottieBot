import type { CallbackQueryMiddleware, Context } from "grammy";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { logInfo } from "../logger.js";
import {
  createStarSupportPayload,
  isStarSupportAmount,
} from "../logic/starsSupport.js";

export const starsSupportCBQ: CallbackQueryMiddleware<Context> = async (
  ctx,
) => {
  const amount = Number(ctx.match[1]);
  const userId = ctx.from.id;
  await ctx.answerCallbackQuery();

  if (!isStarSupportAmount(amount)) {
    return ctx.reply(
      tr(
        ctx,
        "Please choose one of the suggested amounts.",
        "Выберите одну из предложенных сумм.",
      ),
    );
  }

  logProductEvent(userId, "stars_invoice_requested", {
    amount,
    currency: "XTR",
  });
  logInfo("stars.invoice_requested", {
    user_id: userId,
    amount,
    currency: "XTR",
  });

  await ctx.replyWithInvoice(
    tr(ctx, "Support Sticker2Lottie", "Поддержка Sticker2Lottie"),
    tr(
      ctx,
      "A voluntary contribution that helps keep the bot running and improving.",
      "Добровольная поддержка помогает развивать бота и оплачивать его работу.",
    ),
    createStarSupportPayload(userId, amount),
    "XTR",
    [{ label: tr(ctx, "Bot support", "Поддержка бота"), amount }],
  );
};
