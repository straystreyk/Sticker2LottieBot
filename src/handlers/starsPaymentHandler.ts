import type { Context } from "grammy";
import { logProductEvent, recordSupportPayment } from "../db/database.js";
import { tr } from "../i18n.js";
import { logInfo, logWarn } from "../logger.js";
import { parseStarSupportPayload } from "../logic/starsSupport.js";

export async function starsPreCheckoutHandler(ctx: Context) {
  const query = ctx.preCheckoutQuery;
  if (!query) return;

  const payload = parseStarSupportPayload(query.invoice_payload);
  const valid =
    query.currency === "XTR" &&
    payload !== null &&
    payload.telegramUserId === query.from.id &&
    payload.amount === query.total_amount;

  if (!valid) {
    logWarn("stars.pre_checkout_rejected", {
      user_id: query.from.id,
      currency: query.currency,
      amount: query.total_amount,
      payload_valid: payload !== null,
    });
    if (ctx.from?.id) {
      logProductEvent(ctx.from.id, "stars_pre_checkout_rejected", {
        currency: query.currency,
        amount: query.total_amount,
      });
    }
    await ctx.answerPreCheckoutQuery(
      false,
      tr(
        ctx,
        "This payment could not be verified. Please create a new invoice in the bot.",
        "Не удалось проверить платёж. Создайте новый счёт в боте.",
      ),
    );
    return;
  }

  await ctx.answerPreCheckoutQuery(true);
  logProductEvent(query.from.id, "stars_pre_checkout_approved", {
    currency: query.currency,
    amount: query.total_amount,
  });
  logInfo("stars.pre_checkout_approved", {
    user_id: query.from.id,
    currency: query.currency,
    amount: query.total_amount,
  });
}

export async function starsSuccessfulPaymentHandler(ctx: Context) {
  const payment = ctx.message?.successful_payment;
  const userId = ctx.from?.id;
  if (!payment || !userId) return;

  const payload = parseStarSupportPayload(payment.invoice_payload);
  const valid =
    payment.currency === "XTR" &&
    payload !== null &&
    payload.telegramUserId === userId &&
    payload.amount === payment.total_amount;

  if (!valid) {
    logWarn("stars.successful_payment_unrecognized", {
      user_id: userId,
      currency: payment.currency,
      amount: payment.total_amount,
      payload_valid: payload !== null,
    });
    return;
  }

  const inserted = recordSupportPayment({
    telegramUserId: userId,
    currency: "XTR",
    amount: payment.total_amount,
    invoicePayload: payment.invoice_payload,
    telegramPaymentChargeId: payment.telegram_payment_charge_id,
    providerPaymentChargeId: payment.provider_payment_charge_id,
  });

  if (!inserted) {
    logInfo("stars.payment_duplicate", {
      user_id: userId,
      amount: payment.total_amount,
    });
    return;
  }

  logProductEvent(userId, "stars_payment_completed", {
    currency: "XTR",
    amount: payment.total_amount,
  });
  logInfo("stars.payment_completed", {
    user_id: userId,
    currency: "XTR",
    amount: payment.total_amount,
  });

  await ctx.reply(
    tr(
      ctx,
      `Thank you for supporting the bot with ${payment.total_amount} ⭐! It genuinely helps the project grow.`,
      `Спасибо за поддержку бота на ${payment.total_amount} ⭐! Это действительно помогает проекту развиваться.`,
    ),
  );
}
