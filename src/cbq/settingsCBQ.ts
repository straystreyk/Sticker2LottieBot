import type { CallbackQueryMiddleware, Context } from "grammy";
import {
  getUserPreferences,
  logProductEvent,
  setUserDefaultOutputFormat,
  setUserLanguage,
  setUserNotifications,
} from "../db/database.js";
import { settingsCommand } from "../commands/settings.js";
import { convertFlowStore } from "../store/convertTypesStore.js";
import { tr } from "../i18n.js";

export const settingsOpenCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  await ctx.answerCallbackQuery();
  return settingsCommand(ctx);
};

export const settingsFormatCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const format = ctx.match[1] as "json" | "lottie";
  const userId = ctx.from.id;
  setUserDefaultOutputFormat(userId, format);
  convertFlowStore.setMode(userId, "tgs2lottie");
  convertFlowStore.setFormat(userId, format);
  logProductEvent(userId, "setting_changed", { setting: "output_format", value: format });
  await ctx.answerCallbackQuery(tr(ctx, "Saved", "Сохранено"));
  return ctx.reply(tr(ctx, `Default TGS output: .${format}`, `Формат TGS по умолчанию: .${format}`));
};

export const settingsLanguageCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const language = ctx.match[1] as "en" | "ru";
  const userId = ctx.from.id;
  setUserLanguage(userId, language);
  logProductEvent(userId, "setting_changed", { setting: "language", value: language });
  await ctx.answerCallbackQuery(language === "ru" ? "Сохранено" : "Saved");
  return ctx.reply(language === "ru" ? "Язык изменён на русский." : "Language changed to English.");
};

export const settingsNotificationsCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const enabled = ctx.match[1] === "on";
  const userId = ctx.from.id;
  setUserNotifications(userId, enabled);
  logProductEvent(userId, "setting_changed", { setting: "notifications", value: enabled });
  await ctx.answerCallbackQuery(tr(ctx, "Saved", "Сохранено"));
  const current = getUserPreferences(userId).notificationsEnabled;
  return ctx.reply(
    tr(
      ctx,
      `Product news are ${current ? "enabled" : "disabled"}. Conversion results and service messages are unaffected.`,
      `Новости продукта ${current ? "включены" : "выключены"}. Результаты конвертации и сервисные сообщения продолжат приходить.`,
    ),
  );
};

