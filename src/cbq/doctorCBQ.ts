import type { CallbackQueryMiddleware, Context } from "grammy";
import { startDoctor } from "../commands/doctor.js";
import { tr } from "../i18n.js";
import { doctorStore } from "../store/doctorStore.js";

export const doctorStartCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  await ctx.answerCallbackQuery();
  await startDoctor(ctx);
};

export const doctorCancelCBQ: CallbackQueryMiddleware<Context> = async (
  ctx,
) => {
  doctorStore.clear(ctx.from.id);
  await ctx.answerCallbackQuery(tr(ctx, "Cancelled", "Отменено"));
  await ctx.reply(
    tr(ctx, "Sticker Doctor stopped.", "Sticker Doctor остановлен."),
  );
};
