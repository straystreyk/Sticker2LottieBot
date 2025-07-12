import { convertTypesStore } from "../store/convertTypesStore.js";
const formatCBQ = async (ctx) => {
    const format = ctx.match[1];
    const userId = ctx.from.id;
    convertTypesStore.set(userId, format);
    await ctx.answerCallbackQuery();
    await ctx.reply(`The ${format} format is selected. Now format the sticker.`);
};
export { formatCBQ };
//# sourceMappingURL=formatCBQ.js.map