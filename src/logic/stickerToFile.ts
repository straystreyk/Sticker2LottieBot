import { convertTypesStore } from "../store/convertTypesStore.js";
import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import zlib from "node:zlib";
import { Context, InputFile } from "grammy";
import JSZip from "jszip";
import { CONFIG } from "../config.js";

const stickerToFile = async (ctx: Context) => {
  const userId = ctx.from?.id;

  if (!userId) return ctx.reply("No userId passed");

  const format = convertTypesStore.get(userId);

  if (!format) {
    return ctx.reply("First select the format via the /convert command");
  }

  const fileId = ctx.msg?.sticker?.file_id;

  if (!fileId) return ctx.reply("FileID not passed");

  const file = await ctx.api.getFile(fileId);
  const filePath = file.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${CONFIG.botToken}/${filePath}`;

  try {
    const response = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(response.data);
    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) return ctx.reply("Unable to determine file format");

    if (fileType.ext !== "gz") {
      return ctx.reply("Only animated sticker format (.tgs) is supported");
    }

    const unzippedBuffer = zlib.gunzipSync(buffer);
    const lottieJSON = unzippedBuffer.toString("utf-8");

    if (format === "json") {
      await ctx.replyWithDocument(
        new InputFile(Buffer.from(lottieJSON), "sticker.json"),
        {
          caption: "📄 Here is your .json file",
        },
      );
    } else if (format === "lottie") {
      const zip = new JSZip();

      zip.file("animations/animation.json", lottieJSON);

      const manifest = {
        version: "2.0",
        author: "@MasterSaya",
        animations: [
          {
            id: "animation",
            path: "animations/animation.json",
          },
        ],
      };

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const lottieBuffer = await zip.generateAsync({ type: "nodebuffer" });

      await ctx.replyWithDocument(
        new InputFile(lottieBuffer, "sticker.lottie"),
        {
          caption: "🎉 Here is your .lottie file (v2)",
        },
      );
    }

    // Очищаем выбор после обработки
    convertTypesStore.delete(userId);
  } catch (e) {
    console.error(e);
    ctx.reply("There was an error processing the sticker.");
  }
};

export { stickerToFile };
