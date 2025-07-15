import { stickerToFile } from "../logic/stickerToFile.js";
import { Context } from "grammy";
import { convertTypesStore } from "../store/convertTypesStore.js";

const textHandler = async (ctx: Context) => {
  const userId = ctx.from?.id;

  if (userId && convertTypesStore.get(userId)) {
    const entities = ctx.message?.entities;
    const emojiIds =
      entities
        ?.filter((e) => e.type === "custom_emoji")
        .map((e) => e.custom_emoji_id) || [];

    if (emojiIds.length) {
      const stickerFiles = await ctx.api.getCustomEmojiStickers(emojiIds);
      if (stickerFiles.length) {
        stickerFiles.forEach((file) => {
          stickerToFile(ctx, file.file_id);
        });
      }
    } else {
      return ctx.reply("No sticker file found. Maybe this is not a sticker :(");
    }

    return;
  }

  return ctx.reply("First select the format via the /convert command");
};

export { textHandler };
