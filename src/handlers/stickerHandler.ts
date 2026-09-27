import { stickerToFile } from "../logic/stickerToFile.js";
import { Context } from "grammy";
import { downloadTelegramFile } from "../logic/downloadTelegramFile.js";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { doctorStore } from "../store/doctorStore.js";
import { diagnoseSticker } from "../logic/stickerDoctor.js";

const stickerHandler = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const sticker = ctx.message?.sticker;
  if (!sticker?.file_id)
    return ctx.reply(
      tr(ctx, "No sticker file found.", "Файл стикера не найден."),
    );

  if (doctorStore.take(userId)) {
    try {
      await diagnoseSticker(ctx);
    } catch (error) {
      await ctx.reply(
        tr(
          ctx,
          `Sticker Doctor could not inspect this sticker: ${error instanceof Error ? error.message : "unknown error"}`,
          `Sticker Doctor не смог проверить стикер: ${error instanceof Error ? error.message : "неизвестная ошибка"}`,
        ),
      );
    }
    return;
  }

  logProductEvent(userId, "file_received", {
    source_type: sticker.is_video
      ? "webm"
      : sticker.is_animated
        ? "tgs"
        : "webp",
  });

  if (sticker.is_video || !sticker.is_animated) {
    const extension = sticker.is_video ? "webm" : "webp";
    await downloadTelegramFile(
      ctx,
      sticker.file_id,
      `sticker_${sticker.file_unique_id}.${extension}`,
      tr(
        ctx,
        "This sticker format is not converted to Lottie, so I sent you the original file.",
        "Этот формат не конвертируется в Lottie, поэтому я отправил оригинальный файл.",
      ),
    );
    return;
  }

  await stickerToFile(ctx, sticker.file_id);
};

export { stickerHandler };
