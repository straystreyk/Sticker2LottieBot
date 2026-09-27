import type { CallbackQueryMiddleware, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getConversionResult,
  logProductEvent,
  toggleConversionResultFavorite,
} from "../db/database.js";
import { tr } from "../i18n.js";
import { buildStudioPage } from "../commands/studio.js";

function itemText(
  ctx: Context,
  item: NonNullable<ReturnType<typeof getConversionResult>>,
) {
  return tr(
    ctx,
    [
      item.is_favorite ? "⭐ Favorite result" : "Saved result",
      `File: ${item.file_name ?? item.target_type.toUpperCase()}`,
      `Conversion: ${item.source_type} → ${item.target_type}`,
      `Saved: ${item.created_at}`,
    ].join("\n"),
    [
      item.is_favorite ? "⭐ Избранный результат" : "Сохранённый результат",
      `Файл: ${item.file_name ?? item.target_type.toUpperCase()}`,
      `Конвертация: ${item.source_type} → ${item.target_type}`,
      `Сохранён: ${item.created_at}`,
    ].join("\n"),
  );
}

function itemKeyboard(
  ctx: Context,
  item: NonNullable<ReturnType<typeof getConversionResult>>,
) {
  const keyboard = new InlineKeyboard()
    .text(
      item.is_favorite
        ? tr(ctx, "Remove favorite", "Убрать из избранного")
        : tr(ctx, "Add favorite", "В избранное"),
      `studio:fav:${item.id}`,
    )
    .row();
  if (item.output_kind === "sticker") {
    keyboard
      .text(
        tr(ctx, "Add to pack builder", "В конструктор пака"),
        `builder:add:${item.id}`,
      )
      .row();
  }
  return keyboard.text(
    tr(ctx, "Back to Studio", "Назад в студию"),
    "studio:page:1",
  );
}

export const studioPageCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const pageNumber = Number(ctx.match[1]);
  const page = buildStudioPage(ctx, pageNumber);
  await ctx.answerCallbackQuery();
  if (!page) return;
  await ctx.editMessageText(page.text, { reply_markup: page.keyboard });
};

export const studioViewCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const userId = ctx.from.id;
  const resultId = Number(ctx.match[1]);
  const item = getConversionResult(userId, resultId);
  await ctx.answerCallbackQuery();
  if (!item) {
    return ctx.reply(
      tr(ctx, "This result was not found.", "Результат не найден."),
    );
  }

  if (item.output_kind === "sticker") {
    await ctx.replyWithSticker(item.telegram_file_id);
  } else {
    await ctx.replyWithDocument(item.telegram_file_id);
  }
  logProductEvent(userId, "studio_result_downloaded", {
    result_id: item.id,
    target_type: item.target_type,
  });
  return ctx.reply(itemText(ctx, item), {
    reply_markup: itemKeyboard(ctx, item),
  });
};

export const studioFavoriteCBQ: CallbackQueryMiddleware<Context> = async (
  ctx,
) => {
  const item = toggleConversionResultFavorite(
    ctx.from.id,
    Number(ctx.match[1]),
  );
  await ctx.answerCallbackQuery(
    item?.is_favorite
      ? tr(ctx, "Added to favorites", "Добавлено в избранное")
      : tr(ctx, "Updated", "Обновлено"),
  );
  if (!item) return;
  logProductEvent(ctx.from.id, "studio_favorite_toggled", {
    result_id: item.id,
    favorite: Boolean(item.is_favorite),
  });
  await ctx.editMessageText(itemText(ctx, item), {
    reply_markup: itemKeyboard(ctx, item),
  });
};

export const studioNoopCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  await ctx.answerCallbackQuery();
};
