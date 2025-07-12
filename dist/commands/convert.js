import { InlineKeyboard } from "grammy";
const convertCommand = async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text(".lottie", "format:lottie")
        .text(".json", "format:json");
    await ctx.reply("Select format to convert:", {
        reply_markup: keyboard,
    });
};
export { convertCommand };
//# sourceMappingURL=convert.js.map