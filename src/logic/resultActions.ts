import { InlineKeyboard, type Context } from "grammy";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { sendDonationPrompt } from "./sendDonationPrompt.js";

export async function sendResultActions(
  ctx: Context,
  options?: { canAddToPack?: boolean },
) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const referralUrl = `https://t.me/${ctx.me.username}?start=ref_${userId}`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(
    tr(
      ctx,
      "Convert Telegram stickers, Lottie and SVG in one tap",
      "Конвертируй Telegram-стикеры, Lottie и SVG в один клик",
    ),
  )}`;

  const keyboard = new InlineKeyboard();
  if (options?.canAddToPack) {
    keyboard
      .text(
        tr(ctx, "Add to my sticker pack", "Добавить в мой стикерпак"),
        "pack:add",
      )
      .row();
  }
  keyboard
    .text(tr(ctx, "Convert another", "Конвертировать ещё"), "onboard:file")
    .row()
    .text(tr(ctx, "My Studio", "Моя студия"), "studio:page:1")
    .row()
    .url(tr(ctx, "Share bot", "Поделиться ботом"), shareUrl);

  logProductEvent(userId, "result_actions_shown", {
    can_add_to_pack: Boolean(options?.canAddToPack),
  });
  await ctx.reply(
    tr(ctx, "What would you like to do next?", "Что сделать дальше?"),
    {
      reply_markup: keyboard,
    },
  );
}

export async function sendDonationPromptSafely(ctx: Context) {
  try {
    await sendDonationPrompt(ctx);
  } catch (error) {
    console.error("Unable to send donation prompt", error);
  }
}

export async function sendPostConversionMessages(
  ctx: Context,
  options?: { canAddToPack?: boolean },
) {
  try {
    await sendResultActions(ctx, options);
  } catch (error) {
    console.error("Unable to send result actions", error);
  }
  await sendDonationPromptSafely(ctx);
}
