import type { Context } from "grammy";
import { tr } from "../i18n.js";

export async function paySupportCommand(ctx: Context) {
  return ctx.reply(
    tr(
      ctx,
      "If you have a problem with a Telegram Stars payment, contact @MasterSaya and include the payment date, amount, and a screenshot of the receipt.",
      "Если возникла проблема с платежом в Telegram Stars, напишите @MasterSaya и приложите дату, сумму и скриншот чека.",
    ),
  );
}
