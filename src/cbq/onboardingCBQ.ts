import type { CallbackQueryMiddleware, Context } from "grammy";
import { InputFile } from "grammy";
import { gzipSync } from "node:zlib";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { resultStore } from "../store/resultStore.js";
import { sendPostConversionMessages } from "../logic/resultActions.js";

const demoLottie = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 512,
  h: 512,
  nm: "Sticker2Lottie demo",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [256, 256, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              t: 0,
              s: [40, 40, 100],
              e: [100, 100, 100],
              i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] },
              o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] },
            },
            {
              t: 30,
              s: [100, 100, 100],
              e: [40, 40, 100],
              i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] },
              o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] },
            },
            { t: 60, s: [40, 40, 100] },
          ],
        },
      },
      shapes: [
        { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [240, 240] }, nm: "Ellipse" },
        { ty: "fl", c: { a: 0, k: [0.2, 0.55, 1, 1] }, o: { a: 0, k: 100 }, r: 1, nm: "Fill" },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
};

export const onboardingCBQ: CallbackQueryMiddleware<Context> = async (ctx) => {
  const action = ctx.match[1];
  const userId = ctx.from.id;
  logProductEvent(userId, "onboarding_action_selected", { action });
  await ctx.answerCallbackQuery();

  if (action === "demo") {
    const jsonText = JSON.stringify(demoLottie);
    const tgs = gzipSync(Buffer.from(jsonText), { level: 9 });
    const sent = await ctx.replyWithSticker(new InputFile(tgs, "demo.tgs"));
    await ctx.replyWithDocument(new InputFile(Buffer.from(jsonText), "demo.json"), {
      caption: tr(
        ctx,
        "Demo complete: an animated TGS sticker and its Lottie JSON.",
        "Демо готово: анимированный TGS-стикер и его Lottie JSON.",
      ),
    });
    if (sent.sticker?.file_id) {
      resultStore.set(userId, { fileId: sent.sticker.file_id, emoji: "✨" });
    }
    logProductEvent(userId, "demo_completed");
    await sendPostConversionMessages(ctx, { canAddToPack: true });
    return;
  }

  if (action === "tgs") {
    return ctx.reply(
      tr(
        ctx,
        "Send me an animated Telegram sticker. On first use I will ask whether you want .lottie or .json.",
        "Отправьте анимированный Telegram-стикер. При первом использовании я спрошу: .lottie или .json.",
      ),
    );
  }

  return ctx.reply(
    tr(
      ctx,
      "Send a .json, .lottie or .svg file. I will convert it to TGS automatically.",
      "Отправьте файл .json, .lottie или .svg. Я автоматически конвертирую его в TGS.",
    ),
  );
};
