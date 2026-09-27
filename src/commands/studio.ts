import { InlineKeyboard, type Context } from "grammy";
import { getConversionResultsPage, logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";

export const STUDIO_PAGE_SIZE = 6;

function resultLabel(item: {
  id: number;
  file_name: string | null;
  source_type: string;
  target_type: string;
  is_favorite: number;
}) {
  const isGenericName =
    !item.file_name || /^sticker\.[a-z0-9]+$/i.test(item.file_name);
  const name = isGenericName
    ? `${item.source_type.toUpperCase()} → ${item.target_type.toUpperCase()} #${item.id}`
    : item.file_name!.slice(0, 28);
  return `${item.is_favorite ? "⭐" : "▫️"} ${name}`;
}

export function buildStudioPage(ctx: Context, page: number) {
  const userId = ctx.from?.id;
  if (!userId) return null;
  const data = getConversionResultsPage(userId, page, STUDIO_PAGE_SIZE);
  const keyboard = new InlineKeyboard();

  for (const item of data.items) {
    keyboard.text(resultLabel(item), `studio:view:${item.id}`).row();
  }

  if (data.totalPages > 1) {
    if (data.page > 1) keyboard.text("◀️", `studio:page:${data.page - 1}`);
    keyboard.text(`${data.page}/${data.totalPages}`, "studio:noop");
    if (data.page < data.totalPages) {
      keyboard.text("▶️", `studio:page:${data.page + 1}`);
    }
    keyboard.row();
  }

  keyboard
    .switchInlineCurrent(
      tr(ctx, "Send to this chat", "Отправить в этот чат"),
      "",
    )
    .row()
    .text(
      tr(ctx, "Sticker pack builder", "Конструктор стикерпака"),
      "builder:open",
    )
    .row()
    .text(tr(ctx, "Sticker Doctor", "Sticker Doctor"), "doctor:start");

  const text = data.total
    ? tr(
        ctx,
        `My Studio\nSaved results: ${data.total}\n\nTap a result to download, favorite or add it to a sticker pack.`,
        `Моя студия\nСохранено результатов: ${data.total}\n\nНажмите на результат, чтобы скачать, добавить в избранное или в стикерпак.`,
      )
    : tr(
        ctx,
        "My Studio is empty. Convert a sticker or file and the result will appear here.",
        "Моя студия пока пуста. Конвертируйте стикер или файл — результат появится здесь.",
      );

  return { text, keyboard, data };
}

export async function studioCommand(ctx: Context) {
  const page = buildStudioPage(ctx, 1);
  if (!page) return;
  if (ctx.from?.id) {
    logProductEvent(ctx.from.id, "studio_opened", {
      results_count: page.data.total,
    });
  }
  return ctx.reply(page.text, { reply_markup: page.keyboard });
}
