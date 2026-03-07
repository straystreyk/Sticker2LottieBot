// cbq/modeCBQ.ts
import type { CallbackQueryMiddleware, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {convertFlowStore} from "../store/convertTypesStore.js";
import { setUserMode } from "../db/database.js";

export const modeCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
    const mode = ctx.match[1] as "tgs2lottie" | "lottie2tgs";
    const userId = ctx.from?.id;
    if (!userId) return;

    convertFlowStore.setMode(userId, mode);
    setUserMode(userId, mode);

    await ctx.answerCallbackQuery();

    if (mode === "tgs2lottie") {
        const kb = new InlineKeyboard()
            .text("as .lottie", "format:lottie")
            .row()
            .text("as .json", "format:json");

        return ctx.reply("Choose output format:", { reply_markup: kb });
    }

    // lottie2tgs
    return ctx.reply("Send me a Lottie file (.json or .lottie) and I will return a .tgs sticker.");
};
