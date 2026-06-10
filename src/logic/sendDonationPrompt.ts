import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { CONFIG } from "../config.js";

export async function sendDonationPrompt(ctx: Context) {
  const address = CONFIG.donationTonAddress.trim();
  if (!address) return;

  const keyboard = new InlineKeyboard().url("Donate TON", `https://tonviewer.com/${address}`);

  await ctx.reply(
    ["If this bot was helpful, consider supporting it with a TON donation:", `<code>${address}</code>`].join("\n"),
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    },
  );
}
