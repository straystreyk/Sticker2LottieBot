import { InlineKeyboard, type Context } from "grammy";
import { logProductEvent, setUserStartAttribution } from "../db/database.js";
import { tr } from "../i18n.js";
import { studioCommand } from "./studio.js";

export async function startCommand(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const payload = typeof ctx.match === "string" ? ctx.match.trim() : "";
  const referrerMatch = payload.match(/^ref_(\d+)$/);
  const referrerUserId = referrerMatch ? Number(referrerMatch[1]) : null;
  const safeReferrer =
    referrerUserId && referrerUserId !== userId ? referrerUserId : null;

  setUserStartAttribution(userId, payload || "direct", safeReferrer);
  logProductEvent(userId, "start", {
    source: payload || "direct",
    referrer_user_id: safeReferrer,
  });

  if (payload === "studio") return studioCommand(ctx);

  const keyboard = new InlineKeyboard()
    .text(tr(ctx, "Try a demo", "Попробовать демо"), "onboard:demo")
    .row()
    .text(tr(ctx, "TGS → Lottie/JSON", "TGS → Lottie/JSON"), "onboard:tgs")
    .row()
    .text(tr(ctx, "File → TGS", "Файл → TGS"), "onboard:file")
    .row()
    .text(
      tr(ctx, "Download sticker pack", "Скачать стикерпак"),
      "packdl:choose",
    )
    .row()
    .text(tr(ctx, "My Studio", "Моя студия"), "studio:page:1")
    .row()
    .text(tr(ctx, "Sticker Doctor", "Sticker Doctor"), "doctor:start")
    .row()
    .text(tr(ctx, "Pack builder", "Конструктор пака"), "builder:open")
    .row()
    .text(tr(ctx, "Settings", "Настройки"), "settings:open");

  return ctx.reply(
    tr(
      ctx,
      [
        "👋 I convert Telegram stickers, Lottie and SVG.",
        "",
        "Send an animated sticker, .json, .lottie or .svg file — I will detect the direction automatically.",
      ].join("\n"),
      [
        "👋 Я конвертирую Telegram-стикеры, Lottie и SVG.",
        "",
        "Отправьте анимированный стикер или файл .json, .lottie, .svg — направление определится автоматически.",
      ].join("\n"),
    ),
    { reply_markup: keyboard },
  );
}
