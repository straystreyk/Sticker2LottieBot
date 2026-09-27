import { InlineKeyboard, type Context } from "grammy";
import { getUserPreferences } from "../db/database.js";
import { tr } from "../i18n.js";

export async function settingsCommand(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const preferences = getUserPreferences(userId);
  const keyboard = new InlineKeyboard()
    .text("TGS → .lottie", "settings:format:lottie")
    .text("TGS → .json", "settings:format:json")
    .row()
    .text("Русский", "settings:lang:ru")
    .text("English", "settings:lang:en")
    .row()
    .text(
      preferences.notificationsEnabled
        ? tr(ctx, "Product news: on", "Новости продукта: вкл")
        : tr(ctx, "Product news: off", "Новости продукта: выкл"),
      `settings:notifications:${preferences.notificationsEnabled ? "off" : "on"}`,
    );

  return ctx.reply(
    tr(
      ctx,
      `Settings\nTGS output: ${preferences.defaultOutputFormat ?? "ask on first use"}`,
      `Настройки\nФормат для TGS: ${preferences.defaultOutputFormat ?? "спросить при первом использовании"}`,
    ),
    { reply_markup: keyboard },
  );
}

