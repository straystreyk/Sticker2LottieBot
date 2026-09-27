import { InlineKeyboard, type Context } from "grammy";
import { gunzipSync, gzipSync } from "node:zlib";
import { logProductEvent } from "../db/database.js";
import { tr } from "../i18n.js";
import { autoFixStore } from "../store/autoFixStore.js";
import {
  extractLottieJson,
  inspectTelegramCompatibility,
  parseAndInspectLottie,
} from "./lottieFileToTgsSticker.js";
import { getTelegramFileBuffer } from "./downloadTelegramFile.js";

type DoctorSourceType = "json" | "lottie" | "tgs";

async function reportLottie(
  ctx: Context,
  jsonText: string,
  sourceType: DoctorSourceType,
  compressedBytes?: number,
) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const { json, meta } = parseAndInspectLottie(jsonText);
  const tgsBytes =
    compressedBytes ??
    gzipSync(Buffer.from(jsonText, "utf-8"), { level: 9 }).byteLength;
  const compatibility = inspectTelegramCompatibility(json, meta, tgsBytes);
  const score = Math.max(0, 100 - compatibility.warnings.length * 20);
  const status = compatibility.canSendAsSticker
    ? tr(ctx, "✅ Ready for Telegram", "✅ Готово для Telegram")
    : tr(ctx, "⚠️ Needs attention", "⚠️ Требует исправления");
  const lines = [
    tr(ctx, "Sticker Doctor report", "Отчёт Sticker Doctor"),
    status,
    tr(
      ctx,
      `Compatibility score: ${score}/100`,
      `Оценка совместимости: ${score}/100`,
    ),
    `📐 ${meta.w ?? "?"}×${meta.h ?? "?"}`,
    `🎞 ${meta.fr ?? "?"} FPS · ${meta.durationSec?.toFixed(2) ?? "?"}s`,
    `🧩 ${meta.layers ?? "?"} layers · ${(tgsBytes / 1024).toFixed(1)} KB`,
  ];

  if (compatibility.warnings.length) {
    lines.push("", ...compatibility.warnings.map((warning) => `• ${warning}`));
    autoFixStore.set(userId, { jsonText, sourceType });
  }

  logProductEvent(userId, "sticker_doctor_completed", {
    source_type: sourceType,
    score,
    compatible: compatibility.canSendAsSticker,
    warnings_count: compatibility.warnings.length,
  });
  const keyboard = compatibility.warnings.length
    ? new InlineKeyboard().text(
        tr(ctx, "Fix automatically", "Исправить автоматически"),
        "autofix:latest",
      )
    : undefined;
  await ctx.reply(lines.join("\n"), { reply_markup: keyboard });
}

export async function diagnoseDocument(ctx: Context) {
  const document = ctx.message?.document;
  if (!document) return;
  const fileName = document.file_name?.toLowerCase() ?? "";
  const { buffer } = await getTelegramFileBuffer(ctx, document.file_id);

  if (fileName.endsWith(".tgs")) {
    await reportLottie(
      ctx,
      gunzipSync(buffer).toString("utf-8"),
      "tgs",
      buffer.byteLength,
    );
    return;
  }
  if (fileName.endsWith(".json") || fileName.endsWith(".lottie")) {
    const sourceType = fileName.endsWith(".lottie") ? "lottie" : "json";
    await reportLottie(
      ctx,
      await extractLottieJson(buffer, fileName),
      sourceType,
    );
    return;
  }
  if (fileName.endsWith(".svg")) {
    const svg = buffer.toString("utf-8");
    const risky = [
      "text",
      "image",
      "filter",
      "mask",
      "linearGradient",
      "radialGradient",
    ].filter((tag) => new RegExp(`<${tag}\\b`, "i").test(svg));
    const score = Math.max(20, 100 - risky.length * 15);
    logProductEvent(ctx.from!.id, "sticker_doctor_completed", {
      source_type: "svg",
      score,
      warnings_count: risky.length,
    });
    await ctx.reply(
      [
        tr(ctx, "Sticker Doctor report", "Отчёт Sticker Doctor"),
        tr(
          ctx,
          `SVG conversion score: ${score}/100`,
          `Оценка конвертации SVG: ${score}/100`,
        ),
        tr(
          ctx,
          `File size: ${(buffer.byteLength / 1024).toFixed(1)} KB`,
          `Размер файла: ${(buffer.byteLength / 1024).toFixed(1)} КБ`,
        ),
        risky.length
          ? tr(
              ctx,
              `Risky elements: ${risky.join(", ")}`,
              `Проблемные элементы: ${risky.join(", ")}`,
            )
          : tr(
              ctx,
              "No obvious unsupported elements found.",
              "Явных неподдерживаемых элементов не найдено.",
            ),
      ].join("\n"),
    );
    return;
  }

  await ctx.reply(
    tr(
      ctx,
      "Sticker Doctor supports .tgs, .json, .lottie and .svg files.",
      "Sticker Doctor поддерживает файлы .tgs, .json, .lottie и .svg.",
    ),
  );
}

export async function diagnoseSticker(ctx: Context) {
  const sticker = ctx.message?.sticker;
  if (!sticker) return;
  if (!sticker.is_animated) {
    await ctx.reply(
      tr(
        ctx,
        sticker.is_video
          ? "This is a video WEBM sticker, not an animated TGS sticker. TGS auto-fix does not apply."
          : "This is a static WEBP sticker. TGS auto-fix does not apply.",
        sticker.is_video
          ? "Это видео-стикер WEBM, а не анимированный TGS. Автоисправление TGS неприменимо."
          : "Это статический WEBP-стикер. Автоисправление TGS неприменимо.",
      ),
    );
    return;
  }
  const { buffer } = await getTelegramFileBuffer(ctx, sticker.file_id);
  await reportLottie(
    ctx,
    gunzipSync(buffer).toString("utf-8"),
    "tgs",
    buffer.byteLength,
  );
}

function extractSetName(value: string) {
  const link = value.match(/(?:addstickers|addemoji)\/([a-zA-Z0-9_]+)/i);
  if (link) return link[1];
  return value.trim().match(/^[a-zA-Z0-9_]+$/)?.[0] ?? null;
}

export async function diagnoseStickerPack(ctx: Context, input: string) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const setName = extractSetName(input);
  if (!setName) {
    await ctx.reply(
      tr(
        ctx,
        "Send a valid sticker pack link or short name.",
        "Отправьте корректную ссылку или короткое имя стикерпака.",
      ),
    );
    return;
  }

  const set = await ctx.api.getStickerSet(setName);
  let animated = 0;
  let video = 0;
  let staticCount = 0;
  let incompatible = 0;
  let totalBytes = 0;
  const issueCounts = new Map<string, number>();
  const uniqueIds = new Set<string>();

  const progress = await ctx.reply(
    tr(
      ctx,
      `Checking ${set.stickers.length} stickers…`,
      `Проверяю ${set.stickers.length} стикеров…`,
    ),
  );
  for (const [index, sticker] of set.stickers.entries()) {
    uniqueIds.add(sticker.file_unique_id);
    if (sticker.is_animated) {
      animated += 1;
      try {
        const { buffer } = await getTelegramFileBuffer(ctx, sticker.file_id);
        totalBytes += buffer.byteLength;
        const jsonText = gunzipSync(buffer).toString("utf-8");
        const { json, meta } = parseAndInspectLottie(jsonText);
        const check = inspectTelegramCompatibility(
          json,
          meta,
          buffer.byteLength,
        );
        if (!check.canSendAsSticker) incompatible += 1;
        for (const warning of check.warnings) {
          const category = warning.split(" ", 1)[0];
          issueCounts.set(category, (issueCounts.get(category) ?? 0) + 1);
        }
      } catch {
        incompatible += 1;
        issueCounts.set("invalid", (issueCounts.get("invalid") ?? 0) + 1);
      }
    } else if (sticker.is_video) {
      video += 1;
    } else {
      staticCount += 1;
    }
    if ((index + 1) % 10 === 0 || index + 1 === set.stickers.length) {
      await ctx.api.editMessageText(
        progress.chat.id,
        progress.message_id,
        tr(
          ctx,
          `Checking sticker pack… ${index + 1}/${set.stickers.length}`,
          `Проверяю стикерпак… ${index + 1}/${set.stickers.length}`,
        ),
      );
    }
  }

  const duplicates = set.stickers.length - uniqueIds.size;
  const score = animated
    ? Math.max(0, 100 - Math.round((incompatible / animated) * 100))
    : 100;
  const issues = [...issueCounts.entries()]
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ");
  logProductEvent(userId, "sticker_pack_doctor_completed", {
    set_name: setName,
    total: set.stickers.length,
    animated,
    incompatible,
    duplicates,
    score,
  });
  await ctx.api.editMessageText(
    progress.chat.id,
    progress.message_id,
    [
      tr(ctx, "Sticker Doctor — pack report", "Sticker Doctor — отчёт по паку"),
      `${set.title} (${setName})`,
      tr(ctx, `Health score: ${score}/100`, `Оценка состояния: ${score}/100`),
      tr(
        ctx,
        `Total: ${set.stickers.length} · Animated: ${animated} · Video: ${video} · Static: ${staticCount}`,
        `Всего: ${set.stickers.length} · Анимированных: ${animated} · Видео: ${video} · Статичных: ${staticCount}`,
      ),
      tr(
        ctx,
        `Problematic TGS: ${incompatible} · Duplicates: ${duplicates}`,
        `Проблемных TGS: ${incompatible} · Дубликатов: ${duplicates}`,
      ),
      animated
        ? tr(
            ctx,
            `Average TGS size: ${(totalBytes / animated / 1024).toFixed(1)} KB`,
            `Средний размер TGS: ${(totalBytes / animated / 1024).toFixed(1)} КБ`,
          )
        : "",
      issues
        ? tr(ctx, `Issues: ${issues}`, `Проблемы: ${issues}`)
        : tr(
            ctx,
            "No TGS limit violations found.",
            "Нарушений ограничений TGS не найдено.",
          ),
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
