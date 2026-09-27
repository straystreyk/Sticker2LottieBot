import type { InlineQueryResult } from "grammy/types";
import type { Context } from "grammy";
import { getInlineConversionResults, logProductEvent } from "../db/database.js";

export async function inlineQueryHandler(ctx: Context) {
  const query = ctx.inlineQuery;
  if (!query) return;

  const items = getInlineConversionResults(query.from.id, query.query);
  const results: InlineQueryResult[] = items.map((item) => {
    if (item.output_kind === "sticker") {
      return {
        type: "sticker",
        id: `studio-${item.id}`,
        sticker_file_id: item.telegram_file_id,
      };
    }
    return {
      type: "document",
      id: `studio-${item.id}`,
      title: item.file_name ?? `${item.source_type} → ${item.target_type}`,
      description: `${item.source_type} → ${item.target_type}`,
      document_file_id: item.telegram_file_id,
      caption: `Created with @${ctx.me.username}`,
    };
  });

  logProductEvent(query.from.id, "inline_gallery_opened", {
    query: query.query.slice(0, 64),
    results_count: results.length,
  });
  await ctx.answerInlineQuery(results, {
    cache_time: 0,
    is_personal: true,
    button: {
      text: "Open My Studio",
      start_parameter: "studio",
    },
  });
}

export async function chosenInlineResultHandler(ctx: Context) {
  const chosen = ctx.chosenInlineResult;
  if (!chosen) return;
  logProductEvent(chosen.from.id, "inline_result_sent", {
    result_id: chosen.result_id,
    query: chosen.query.slice(0, 64),
  });
}
