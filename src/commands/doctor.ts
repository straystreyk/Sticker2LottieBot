import { InlineKeyboard, type Context } from "grammy";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { doctorStore } from "../store/doctorStore.js";

export async function startDoctor(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;
  doctorStore.start(userId);
  logProductEvent(userId, "sticker_doctor_started");
  return ctx.reply(
    tr(
      ctx,
      [
        "Sticker Doctor is ready.",
        "",
        "Send one animated sticker, .tgs, .json, .lottie, .svg file, or a sticker pack link. I will check Telegram limits and suggest a fix when possible.",
      ].join("\n"),
      [
        "Sticker Doctor готов.",
        "",
        "Отправьте анимированный стикер, файл .tgs, .json, .lottie, .svg или ссылку на стикерпак. Я проверю ограничения Telegram и предложу исправление, когда это возможно.",
      ].join("\n"),
    ),
    {
      reply_markup: new InlineKeyboard().text(
        tr(ctx, "Cancel", "Отмена"),
        "doctor:cancel",
      ),
    },
  );
}

export async function doctorCommand(ctx: Context) {
  return startDoctor(ctx);
}
