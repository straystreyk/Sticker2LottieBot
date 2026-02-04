// handlers/documentHandler.ts
import type { Context } from "grammy";
import {convertFlowStore} from "../store/convertTypesStore.js";
import {lottieFileToTgsSticker} from "../logic/lottieFileToTgsSticker.js";

export const documentHandler = async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = convertFlowStore.get(userId);

    if (!state || state.mode !== "lottie2tgs") {
        return ctx.reply("Use /convert first and choose Lottie → TGS.");
    }

    const doc = ctx.message?.document;
    if (!doc?.file_id) return ctx.reply("No file found.");

    const fileName = doc.file_name?.toLowerCase() ?? "";
    const isJson = fileName.endsWith(".json");
    const isLottie = fileName.endsWith(".lottie");

    if (!isJson && !isLottie) {
        return ctx.reply("Please send a Lottie file. For now I support .json (later we can add .lottie).");
    }

    // сейчас делаем только .json как “железобетонный” кейс
    if (!isJson) {
        return ctx.reply("Please send a Lottie JSON (.json). (.lottie support can be added next.)");
    }

    await lottieFileToTgsSticker(ctx, doc.file_id);

    convertFlowStore.clear(userId);
};
