import { InlineKeyboard, type Context } from "grammy";
import { getStickerPackBuilderItems, logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";

export function buildStickerPackBuilderView(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return null;
  const items = getStickerPackBuilderItems(userId);
  const keyboard = new InlineKeyboard();

  for (const [index, item] of items.entries()) {
    const rawName = item.file_name?.replace(/\.[^.]+$/, "") ?? "";
    const name =
      !rawName || rawName.toLowerCase() === "sticker"
        ? `Result #${item.conversion_result_id}`
        : rawName.slice(0, 16);
    keyboard
      .text(`${index + 1}. ${item.emoji} ${name}`, `builder:noop:${item.id}`)
      .text("⬆️", `builder:up:${item.id}`)
      .text("⬇️", `builder:down:${item.id}`)
      .text("😀", `builder:emoji:${item.id}`)
      .text("✖️", `builder:remove:${item.id}`)
      .row();
  }

  if (items.length > 0) {
    keyboard
      .text(tr(ctx, "Publish pack", "Опубликовать пак"), "builder:publish")
      .text(tr(ctx, "Clear", "Очистить"), "builder:clear")
      .row();
  }
  keyboard.text(
    tr(ctx, "Add from My Studio", "Добавить из студии"),
    "studio:page:1",
  );

  const text = items.length
    ? tr(
        ctx,
        [
          "Sticker pack builder",
          `Stickers: ${items.length}/50`,
          "",
          "Use the arrows to set the order. The first sticker becomes the pack cover. Tap 😀 to change its emoji.",
        ].join("\n"),
        [
          "Конструктор стикерпака",
          `Стикеров: ${items.length}/50`,
          "",
          "Стрелками задайте порядок. Первый стикер станет обложкой пака. Нажмите 😀, чтобы изменить emoji.",
        ].join("\n"),
      )
    : tr(
        ctx,
        "The pack builder is empty. Open My Studio and add saved animated stickers.",
        "Конструктор пуст. Откройте «Мою студию» и добавьте сохранённые анимированные стикеры.",
      );
  return { text, keyboard, items };
}

export async function stickerPackBuilderCommand(ctx: Context) {
  const view = buildStickerPackBuilderView(ctx);
  if (!view) return;
  logProductEvent(ctx.from!.id, "sticker_pack_builder_opened", {
    items_count: view.items.length,
  });
  return ctx.reply(view.text, { reply_markup: view.keyboard });
}
