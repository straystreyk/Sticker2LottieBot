import { InlineKeyboard, type Context } from "grammy";
import { tr } from "../i18n.js";

export async function helpCommand(ctx: Context) {
  const keyboard = new InlineKeyboard()
    .text(tr(ctx, "My Studio", "Моя студия"), "studio:page:1")
    .row()
    .text(tr(ctx, "Sticker Doctor", "Sticker Doctor"), "doctor:start")
    .text(tr(ctx, "Pack builder", "Конструктор пака"), "builder:open")
    .row()
    .text(tr(ctx, "Output settings", "Настройки формата"), "settings:open")
    .row()
    .text(tr(ctx, "Download a pack", "Скачать пак"), "packdl:choose");

  return ctx.reply(
    tr(
      ctx,
      [
        "Supported workflows:",
        "• animated TGS sticker → .lottie or .json",
        "• .json / .lottie / simple .svg → TGS",
        "• full sticker pack → ZIP with originals, JSON or Lottie files",
        "• /my → saved results and inline gallery",
        "• /doctor → Telegram compatibility diagnostics",
        "• /pack_builder → order and publish a new animated pack",
        "",
        "Telegram-ready TGS: 512×512, up to 3 seconds, up to 60 fps and under 64 KB.",
      ].join("\n"),
      [
        "Поддерживаемые сценарии:",
        "• анимированный TGS-стикер → .lottie или .json",
        "• .json / .lottie / простой .svg → TGS",
        "• целый стикерпак → ZIP с оригиналами, JSON или Lottie",
        "• /my → сохранённые результаты и inline-галерея",
        "• /doctor → диагностика совместимости с Telegram",
        "• /pack_builder → сборка и публикация нового анимированного пака",
        "",
        "Требования Telegram к TGS: 512×512, до 3 секунд, до 60 fps и меньше 64 КБ.",
      ].join("\n"),
    ),
    { reply_markup: keyboard },
  );
}
