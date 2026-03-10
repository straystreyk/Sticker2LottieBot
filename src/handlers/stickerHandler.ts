import { stickerToFile } from "../logic/stickerToFile.js";
import { Context } from "grammy";
import { convertFlowStore } from "../store/convertTypesStore.js";
import { downloadTelegramFile } from "../logic/downloadTelegramFile.js";

const stickerHandler = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const sticker = ctx.message?.sticker;
  if (!sticker?.file_id) return ctx.reply("No sticker file found.");

  if (sticker.is_video || !sticker.is_animated) {
    const extension = sticker.is_video ? "webm" : "webp";
    await downloadTelegramFile(
      ctx,
      sticker.file_id,
      `sticker_${sticker.file_unique_id}.${extension}`,
      "This sticker format is not converted to Lottie, so I sent you the original file.",
    );
    return;
  }

  const state = convertFlowStore.get(userId);
  if (!state) return ctx.reply("First select the mode via /convert.");

  if (state.mode !== "tgs2lottie") {
    return ctx.reply("You selected Lottie → TGS. Please send a `.json` or `.lottie` file as a document.");
  }

  await stickerToFile(ctx, sticker.file_id);
};

export { stickerHandler };
