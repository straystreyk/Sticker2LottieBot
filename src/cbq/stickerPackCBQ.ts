import type { CallbackQueryMiddleware, Context } from "grammy";
import {
  getInlineConversionResults,
  getUserPreferences,
  logProductEvent,
  setManagedStickerSetName,
} from "../db/database.js";
import { tr } from "../i18n.js";
import { resultStore } from "../store/resultStore.js";

function buildStickerSetName(userId: number, botUsername: string) {
  const safeBotUsername = botUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return `s2l_${userId}_by_${safeBotUsername}`.slice(0, 64);
}

export const stickerPackAddCBQ: CallbackQueryMiddleware<Context> = async (
  ctx,
) => {
  const userId = ctx.from.id;
  const saved = getInlineConversionResults(userId, "").find(
    (item) => item.output_kind === "sticker",
  );
  const generated =
    resultStore.get(userId) ??
    (saved
      ? { fileId: saved.telegram_file_id, emoji: saved.emoji }
      : undefined);
  if (!generated) {
    await ctx.answerCallbackQuery();
    return ctx.reply(
      tr(
        ctx,
        "No saved Telegram-ready sticker was found. Convert a file and try again.",
        "Сохранённый готовый стикер не найден. Конвертируйте файл и попробуйте снова.",
      ),
    );
  }

  await ctx.answerCallbackQuery(tr(ctx, "Adding…", "Добавляю…"));
  const preferences = getUserPreferences(userId);
  const setName =
    preferences.managedStickerSetName ??
    buildStickerSetName(userId, ctx.me.username);
  const sticker = {
    sticker: generated.fileId,
    format: "animated" as const,
    emoji_list: [generated.emoji],
  };

  try {
    if (preferences.managedStickerSetName) {
      await ctx.api.addStickerToSet(userId, setName, sticker);
    } else {
      const ownerName = ctx.from.first_name?.trim() || "My";
      await ctx.api.createNewStickerSet(
        userId,
        setName,
        `${ownerName} · Sticker2Lottie`,
        [sticker],
      );
      setManagedStickerSetName(userId, setName);
    }

    logProductEvent(userId, "sticker_added_to_managed_pack", {
      sticker_set_name: setName,
    });
    return ctx.reply(
      tr(
        ctx,
        "Sticker added to your pack.",
        "Стикер добавлен в ваш стикерпак.",
      ),
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: tr(ctx, "Open sticker pack", "Открыть стикерпак"),
                url: `https://t.me/addstickers/${setName}`,
              },
            ],
          ],
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Telegram error";
    logProductEvent(userId, "sticker_pack_add_failed", { error: message });
    return ctx.reply(
      tr(
        ctx,
        `Telegram could not add this sticker to the pack. You still have the TGS file.\nReason: ${message}`,
        `Telegram не смог добавить стикер в пак. TGS-файл остаётся у вас.\nПричина: ${message}`,
      ),
    );
  }
};
