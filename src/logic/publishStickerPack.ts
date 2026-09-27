import type { Context } from "grammy";
import {
  clearStickerPackBuilder,
  getStickerPackBuilderItems,
  logProductEvent,
  updateStickerPackBuilderEmoji,
} from "../db/database.js";
import { tr } from "../i18n.js";
import { stickerPackBuilderStore } from "../store/stickerPackBuilderStore.js";

function firstEmoji(value: string) {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const candidate = [...segmenter.segment(value.trim())][0]?.segment ?? "";
  return /\p{Extended_Pictographic}/u.test(candidate) ? candidate : null;
}

function buildStickerSetName(userId: number, botUsername: string) {
  const suffix = botUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const unique = `${userId}${Date.now().toString(36)}`;
  const maxPrefixLength = Math.max(1, 64 - `_by_${suffix}`.length);
  return `s2l${unique}`.slice(0, maxPrefixLength) + `_by_${suffix}`;
}

export async function handleStickerPackBuilderText(ctx: Context, text: string) {
  const userId = ctx.from?.id;
  if (!userId) return false;
  const pending = stickerPackBuilderStore.get(userId);
  if (!pending) return false;

  if (pending.kind === "emoji") {
    const emoji = firstEmoji(text);
    if (!emoji) {
      await ctx.reply(
        tr(ctx, "Please send a single emoji.", "Отправьте один emoji."),
      );
      return true;
    }
    updateStickerPackBuilderEmoji(userId, pending.itemId, emoji);
    stickerPackBuilderStore.clear(userId);
    logProductEvent(userId, "sticker_pack_builder_emoji_changed", {
      item_id: pending.itemId,
    });
    await ctx.reply(
      tr(ctx, `Emoji changed to ${emoji}.`, `Emoji изменён на ${emoji}.`),
    );
    return true;
  }

  const title = text.trim();
  if (!title || title.length > 64) {
    await ctx.reply(
      tr(
        ctx,
        "The title must contain 1–64 characters. Send another title.",
        "Название должно содержать 1–64 символа. Отправьте другое название.",
      ),
    );
    return true;
  }

  const items = getStickerPackBuilderItems(userId).slice(0, 50);
  if (!items.length) {
    stickerPackBuilderStore.clear(userId);
    await ctx.reply(tr(ctx, "The builder is empty.", "Конструктор пуст."));
    return true;
  }

  const setName = buildStickerSetName(userId, ctx.me.username);
  const stickers = items.map((item) => ({
    sticker: item.telegram_file_id,
    format: "animated" as const,
    emoji_list: [item.emoji],
  }));

  await ctx.reply(
    tr(ctx, "Publishing the sticker pack…", "Публикую стикерпак…"),
  );
  try {
    await ctx.api.createNewStickerSet(userId, setName, title, stickers);
    stickerPackBuilderStore.clear(userId);
    clearStickerPackBuilder(userId);
    logProductEvent(userId, "sticker_pack_builder_published", {
      set_name: setName,
      stickers_count: stickers.length,
    });
    await ctx.reply(
      tr(
        ctx,
        `Sticker pack published with ${stickers.length} sticker(s).`,
        `Стикерпак опубликован: ${stickers.length} стикер(ов).`,
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
    logProductEvent(userId, "sticker_pack_builder_publish_failed", {
      error: message,
      stickers_count: stickers.length,
    });
    await ctx.reply(
      tr(
        ctx,
        `Telegram could not publish the pack. The builder was preserved.\nReason: ${message}`,
        `Telegram не смог опубликовать пак. Конструктор сохранён.\nПричина: ${message}`,
      ),
    );
  }
  return true;
}
