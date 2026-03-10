import { stickerToFile } from "../logic/stickerToFile.js";
import { Context } from "grammy";
import { convertFlowStore } from "../store/convertTypesStore.js";
import { downloadPackStore } from "../store/downloadPackStore.js";
import { downloadStickerSet } from "../logic/downloadStickerSet.js";

const textHandler = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.message?.text ?? "";
  if (text.startsWith("/")) return;

  if (downloadPackStore.isAwaiting(userId)) {
    downloadPackStore.clear(userId);
    await downloadStickerSet(ctx, text);
    return;
  }

  const state = convertFlowStore.get(userId);
  if (!state) return ctx.reply("First select the mode via /convert.");

  if (state.mode !== "tgs2lottie") {
    return ctx.reply("You selected Lottie → TGS. Send a `.json` or `.lottie` file as a document.");
  }

  // tgs2lottie: можно принимать кастом-эмодзи как раньше
  const entities = ctx.message?.entities;
  const emojiIds =
      entities?.filter((e) => e.type === "custom_emoji").map((e) => e.custom_emoji_id) || [];

  if (!emojiIds.length) {
    return ctx.reply("No sticker file found. Maybe this is not a sticker :(");
  }

  const stickerFiles = await ctx.api.getCustomEmojiStickers(emojiIds);
  if (!stickerFiles.length) return ctx.reply("Couldn't resolve sticker from custom emoji.");

  stickerFiles.forEach((file) => {
    stickerToFile(ctx, file.file_id);
  });
};

export { textHandler };
