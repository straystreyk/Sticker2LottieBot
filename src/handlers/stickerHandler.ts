import { stickerToFile } from "../logic/stickerToFile.js";
import { Context } from "grammy";
import {convertFlowStore} from "../store/convertTypesStore.js";

const stickerHandler = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = convertFlowStore.get(userId);
  if (!state) return ctx.reply("First select the mode via /convert.");

  if (state.mode !== "tgs2lottie") {
    return ctx.reply("You selected Lottie → TGS. Please send a .json Lottie file as a document.");
  }

  const fileId = ctx.message?.sticker?.file_id;
  if (!fileId) return ctx.reply("No sticker file found.");

  await stickerToFile(ctx, fileId);
};

export { stickerHandler };
