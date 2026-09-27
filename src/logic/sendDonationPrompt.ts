import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { CONFIG } from "../config.js";
import { tr } from "../i18n.js";
import { logProductEvent } from "../db/database.js";
import { STAR_SUPPORT_AMOUNTS } from "./starsSupport.js";

export async function sendDonationPrompt(ctx: Context) {
  const address = CONFIG.donationTonAddress.trim();
  const keyboard = new InlineKeyboard();
  for (const amount of STAR_SUPPORT_AMOUNTS) {
    keyboard.text(`⭐ ${amount}`, `support:stars:${amount}`);
  }
  if (address) {
    keyboard
      .row()
      .url(
        tr(ctx, "Donate TON", "Поддержать TON"),
        `https://tonviewer.com/${address}`,
      );
  }

  const lines = [
    tr(
      ctx,
      "If this bot was helpful, you can support it with Telegram Stars or TON:",
      "Если бот оказался полезен, поддержите его Telegram Stars или TON:",
    ),
  ];
  if (address) {
    lines.push(`<code>${address}</code>`);
  }

  await ctx.reply(lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });

  if (ctx.from?.id) {
    logProductEvent(ctx.from.id, "donation_prompt_shown", {
      currencies: address ? ["XTR", "TON"] : ["XTR"],
    });
  }
}
