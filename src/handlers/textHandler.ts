import { stickerToFile } from "../logic/stickerToFile.js";
import { Context } from "grammy";
import { downloadPackStore } from "../store/downloadPackStore.js";
import { downloadStickerSet } from "../logic/downloadStickerSet.js";
import { InlineKeyboard } from "grammy";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { handleStickerPackBuilderText } from "../logic/publishStickerPack.js";
import { doctorStore } from "../store/doctorStore.js";
import { diagnoseStickerPack } from "../logic/stickerDoctor.js";

const textHandler = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.message?.text ?? "";
  if (text.startsWith("/")) return;

  if (await handleStickerPackBuilderText(ctx, text)) return;

  if (doctorStore.take(userId)) {
    try {
      await diagnoseStickerPack(ctx, text);
    } catch (error) {
      await ctx.reply(
        tr(
          ctx,
          `Sticker Doctor could not inspect this pack: ${error instanceof Error ? error.message : "unknown error"}`,
          `Sticker Doctor не смог проверить пак: ${error instanceof Error ? error.message : "неизвестная ошибка"}`,
        ),
      );
    }
    return;
  }

  if (downloadPackStore.isAwaiting(userId)) {
    const output = downloadPackStore.getOutput(userId) ?? "files";
    downloadPackStore.clear(userId);
    await downloadStickerSet(ctx, text, output);
    return;
  }

  if (/t\.me\/(?:addstickers|addemoji)\//i.test(text)) {
    downloadPackStore.setPendingInput(userId, text);
    logProductEvent(userId, "sticker_pack_link_received");
    const keyboard = new InlineKeyboard()
      .text(tr(ctx, "Original files", "Оригиналы"), "packdl:files")
      .row()
      .text("JSON", "packdl:json")
      .text("Lottie", "packdl:lottie");
    return ctx.reply(
      tr(ctx, "Choose the ZIP contents:", "Что положить в ZIP-архив?"),
      {
        reply_markup: keyboard,
      },
    );
  }

  const entities = ctx.message?.entities;
  const emojiIds =
    entities
      ?.filter((e) => e.type === "custom_emoji")
      .map((e) => e.custom_emoji_id) || [];

  if (!emojiIds.length) {
    return ctx.reply(
      tr(
        ctx,
        "No supported file found. Send a sticker, .json, .lottie, .svg or a sticker pack link.",
        "Поддерживаемый файл не найден. Отправьте стикер, .json, .lottie, .svg или ссылку на стикерпак.",
      ),
    );
  }

  const stickerFiles = await ctx.api.getCustomEmojiStickers(emojiIds);
  if (!stickerFiles.length) {
    return ctx.reply(
      tr(
        ctx,
        "Couldn't resolve a sticker from this custom emoji.",
        "Не удалось получить стикер из этого кастомного эмодзи.",
      ),
    );
  }

  logProductEvent(userId, "file_received", {
    source_type: "custom_emoji",
    count: stickerFiles.length,
  });
  await Promise.all(
    stickerFiles.map((file) => stickerToFile(ctx, file.file_id)),
  );
};

export { textHandler };
