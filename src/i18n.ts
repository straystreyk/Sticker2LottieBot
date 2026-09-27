import type { Context } from "grammy";
import { getUserPreferences } from "./db/database.js";

export type Locale = "en" | "ru";

export function getLocale(ctx: Context): Locale {
  const userId = ctx.from?.id;
  if (userId) {
    const stored = getUserPreferences(userId).preferredLanguage;
    if (stored) return stored;
  }

  return ctx.from?.language_code?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function tr(ctx: Context, en: string, ru: string) {
  return getLocale(ctx) === "ru" ? ru : en;
}

