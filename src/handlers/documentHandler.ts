// handlers/documentHandler.ts
import type { Context } from "grammy";
import {convertFlowStore} from "../store/convertTypesStore.js";
import {lottieFileToTgsSticker} from "../logic/lottieFileToTgsSticker.js";
import { svgFileToTgsSticker } from "../logic/svgFileToTgsSticker.js";

export const documentHandler = async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const doc = ctx.message?.document;
    if (!doc?.file_id) return ctx.reply("No file found.");

    const fileName = doc.file_name?.toLowerCase() ?? "";
    const isJson = fileName.endsWith(".json");
    const isLottie = fileName.endsWith(".lottie");
    const isSvg = fileName.endsWith(".svg");

    if (!isJson && !isLottie && !isSvg) {
        return ctx.reply("Please send a Lottie file as `.json` / `.lottie`, or an SVG file as `.svg`.");
    }

    if (isSvg) {
        await svgFileToTgsSticker(ctx, doc.file_id);
        return;
    }

    convertFlowStore.setMode(userId, "lottie2tgs");

    await lottieFileToTgsSticker(ctx, doc.file_id);
};
