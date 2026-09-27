import type { CallbackQueryMiddleware, Context } from "grammy";
import {convertFlowStore} from "../store/convertTypesStore.js";
import { logProductEvent, setUserDefaultOutputFormat } from "../db/database.js";
import { stickerToFile } from "../logic/stickerToFile.js";
import { tr } from "../i18n.js";

const formatCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const format = ctx.match[1] as "lottie" | "json";
  const userId = ctx.from?.id;
  if (!userId) return;

  convertFlowStore.setMode(userId, "tgs2lottie");
  convertFlowStore.setFormat(userId, format);
  setUserDefaultOutputFormat(userId, format);
  logProductEvent(userId, "format_selected", { format, source_type: "tgs" });

  await ctx.answerCallbackQuery();
  const pendingFileId = convertFlowStore.takePendingSticker(userId);
  if (pendingFileId) {
    await ctx.reply(tr(ctx, `Selected .${format}. Converting your sticker…`, `Выбран .${format}. Конвертирую стикер…`));
    await stickerToFile(ctx, pendingFileId);
    return;
  }

  await ctx.reply(
    tr(
      ctx,
      `Selected output: .${format}. Send animated stickers anytime — I will keep using this format.`,
      `Выбран формат .${format}. Отправляйте анимированные стикеры — я запомнил настройку.`,
    ),
  );
};

export { formatCBQ };
