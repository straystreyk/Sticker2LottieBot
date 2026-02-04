// ... твои импорты
import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import zlib from "node:zlib";
import { Context, InputFile } from "grammy";
import JSZip from "jszip";
import { CONFIG } from "../config.js";
import { convertFlowStore } from "../store/convertTypesStore.js";

function buildCaption(base: string, lottieJSON: string) {
  try {
    const lottie = JSON.parse(lottieJSON);

    const w = typeof lottie?.w === "number" ? lottie.w : "?";
    const h = typeof lottie?.h === "number" ? lottie.h : "?";
    const fr = typeof lottie?.fr === "number" ? lottie.fr : "?";
    const ip = typeof lottie?.ip === "number" ? lottie.ip : undefined;
    const op = typeof lottie?.op === "number" ? lottie.op : undefined;
    const layers = Array.isArray(lottie?.layers) ? lottie.layers.length : "?";

    let duration = "?";
    if (typeof fr === "number" && typeof ip === "number" && typeof op === "number" && fr > 0) {
      duration = `${Math.max(0, (op - ip) / fr).toFixed(2)}s`;
    }

    const warnings: string[] = [];
    if (w !== 512 || h !== 512) warnings.push(`canvas ${w}×${h}`);
    if (typeof fr === "number" && fr > 60) warnings.push(`fps ${fr}`);
    // можно добавить duration warning если хочешь

    const infoLines = [
      `📊 ${w}×${h}, ${fr}fps, ${duration}, layers: ${layers}`,
      warnings.length ? `⚠️ ${warnings.join(", ")}` : null,
    ].filter(Boolean);

    const caption = [base, ...infoLines].join("\n");
    return caption.length > 1024 ? caption.slice(0, 1020) + "…" : caption;
  } catch {
    return base; // если JSON не парсится — просто базовый caption
  }
}


export const stickerToFile = async (ctx: Context, fileId?: string) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.reply("No userId passed");

  const state = convertFlowStore.get(userId);
  if (!state) {
    return ctx.reply("First use /convert and choose what you want to do.");
  }

  if (state.mode !== "tgs2lottie") {
    return ctx.reply("You selected Lottie → TGS. Please send a .json Lottie file as a document.");
  }

  const format = state.format; // "json" | "lottie" | undefined
  if (!format) {
    return ctx.reply("Choose output format first (json or lottie).");
  }

  if (!fileId) return ctx.reply("FileID not passed");

  const file = await ctx.api.getFile(fileId);
  const filePath = file.file_path;
  if (!filePath) return ctx.reply("Unable to resolve telegram file path.");

  const downloadUrl = `https://api.telegram.org/file/bot${CONFIG.botToken}/${filePath}`;

  try {
    const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) return ctx.reply("Unable to determine file format");

    if (fileType.ext !== "gz") {
      return ctx.reply("Only animated sticker format (.tgs) is supported");
    }

    const unzippedBuffer = zlib.gunzipSync(buffer);
    const lottieJSON = unzippedBuffer.toString("utf-8");



    if (format === "json") {
      const caption = buildCaption("📄 Here is your .json file", lottieJSON);

      await ctx.replyWithDocument(new InputFile(Buffer.from(lottieJSON), "sticker.json"), {
        caption,
      });
    } else {
      const zip = new JSZip();
      zip.file("animations/animation.json", lottieJSON);

      const manifest = {
        version: "2.0",
        author: "@MasterSaya",
        animations: [{ id: "animation", path: "animations/animation.json" }],
      };

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const lottieBuffer = await zip.generateAsync({ type: "nodebuffer" });

      const caption = buildCaption("🎉 Here is your .lottie file (v2)", lottieJSON);

      await ctx.replyWithDocument(new InputFile(lottieBuffer, "sticker.lottie"), {
        caption,
      });
    }


    convertFlowStore.clear(userId);
  } catch (e) {
    console.error(e);
    return ctx.reply("There was an error processing the sticker.");
  }
};
