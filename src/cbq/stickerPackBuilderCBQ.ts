import type { CallbackQueryMiddleware, Context } from "grammy";
import {
  addResultToStickerPackBuilder,
  clearStickerPackBuilder,
  getStickerPackBuilderItems,
  logProductEvent,
  moveStickerPackBuilderItem,
  removeStickerPackBuilderItem,
} from "../db/database.js";
import { tr } from "../i18n.js";
import { buildStickerPackBuilderView } from "../commands/stickerPackBuilder.js";
import { stickerPackBuilderStore } from "../store/stickerPackBuilderStore.js";

async function refreshBuilder(ctx: Context) {
  const view = buildStickerPackBuilderView(ctx);
  if (!view) return;
  await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
}

export const stickerPackBuilderOpenCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  await ctx.answerCallbackQuery();
  const view = buildStickerPackBuilderView(ctx);
  if (!view) return;
  logProductEvent(ctx.from.id, "sticker_pack_builder_opened", {
    items_count: view.items.length,
  });
  return ctx.reply(view.text, { reply_markup: view.keyboard });
};

export const stickerPackBuilderAddCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  const items = getStickerPackBuilderItems(ctx.from.id);
  if (items.length >= 50) {
    await ctx.answerCallbackQuery(
      tr(
        ctx,
        "The animated pack limit is 50 stickers.",
        "Лимит анимированного пака — 50 стикеров.",
      ),
    );
    return;
  }
  const added = addResultToStickerPackBuilder(
    ctx.from.id,
    Number(ctx.match[1]),
  );
  await ctx.answerCallbackQuery(
    added
      ? tr(ctx, "Added to builder", "Добавлено в конструктор")
      : tr(ctx, "Already added or unavailable", "Уже добавлено или недоступно"),
  );
  logProductEvent(ctx.from.id, "sticker_pack_builder_item_added", {
    result_id: Number(ctx.match[1]),
    added,
  });
};

export const stickerPackBuilderMoveCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  moveStickerPackBuilderItem(
    ctx.from.id,
    Number(ctx.match[2]),
    ctx.match[1] as "up" | "down",
  );
  await ctx.answerCallbackQuery();
  await refreshBuilder(ctx);
};

export const stickerPackBuilderRemoveCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  removeStickerPackBuilderItem(ctx.from.id, Number(ctx.match[1]));
  await ctx.answerCallbackQuery(tr(ctx, "Removed", "Удалено"));
  await refreshBuilder(ctx);
};

export const stickerPackBuilderEmojiCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  stickerPackBuilderStore.set(ctx.from.id, {
    kind: "emoji",
    itemId: Number(ctx.match[1]),
  });
  await ctx.answerCallbackQuery();
  await ctx.reply(
    tr(
      ctx,
      "Send one emoji for this sticker.",
      "Отправьте один emoji для этого стикера.",
    ),
  );
};

export const stickerPackBuilderPublishCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  const items = getStickerPackBuilderItems(ctx.from.id);
  await ctx.answerCallbackQuery();
  if (!items.length) {
    return ctx.reply(
      tr(
        ctx,
        "Add at least one sticker first.",
        "Сначала добавьте хотя бы один стикер.",
      ),
    );
  }
  stickerPackBuilderStore.set(ctx.from.id, { kind: "title" });
  return ctx.reply(
    tr(
      ctx,
      "Send a title for the new sticker pack (1–64 characters).",
      "Отправьте название нового стикерпака (1–64 символа).",
    ),
  );
};

export const stickerPackBuilderClearCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  clearStickerPackBuilder(ctx.from.id);
  await ctx.answerCallbackQuery(
    tr(ctx, "Builder cleared", "Конструктор очищен"),
  );
  await refreshBuilder(ctx);
};

export const stickerPackBuilderNoopCBQ: CallbackQueryMiddleware<
  Context
> = async (ctx) => {
  await ctx.answerCallbackQuery();
};
