import { stickerToFile } from "../logic/stickerToFile.js";
import { Context } from "grammy";

const stickerHandler = async (ctx: Context) => {
  const fileId = ctx.message?.sticker?.file_id;

  if (!fileId) return ctx.reply("No sticker file found.");

  await stickerToFile(ctx, fileId);
};

export { stickerHandler };
