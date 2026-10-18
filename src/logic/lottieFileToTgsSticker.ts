import type { Context } from "grammy";
import { InlineKeyboard, InputFile } from "grammy";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { logConversion, logProductEvent } from "../db/database.js";
import { autoFixStore } from "../store/autoFixStore.js";
import { resultStore } from "../store/resultStore.js";
import {
  sendDonationPromptSafely,
  sendPostConversionMessages,
} from "./resultActions.js";
import { tr } from "../i18n.js";
import { recordSentResult } from "./conversionHistory.js";
import { replyWithTgsDocument } from "./tgsDocument.js";
import { normalizeTelegramPositionEasing } from "./lottieAutoFix.js";

function getTelegramFileUrl(token: string, filePath: string) {
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function downloadAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

export async function extractLottieJson(buf: Buffer, fileName?: string) {
  const normalizedFileName = fileName?.toLowerCase() ?? "";
  const isArchive = normalizedFileName.endsWith(".lottie");

  if (!isArchive) {
    return buf.toString("utf-8");
  }

  const zip = await JSZip.loadAsync(buf);
  const manifestEntry = zip.file("manifest.json");
  if (manifestEntry) {
    const manifestText = await manifestEntry.async("string");
    const manifest = JSON.parse(manifestText);
    const animationPath = manifest?.animations?.[0]?.path;

    if (typeof animationPath === "string") {
      const animationEntry = zip.file(animationPath);
      if (animationEntry) {
        return animationEntry.async("string");
      }
    }
  }

  const fallbackEntry = zip
    .file(/\.json$/i)
    .find((entry) => !entry.dir && entry.name !== "manifest.json");
  if (fallbackEntry) {
    return fallbackEntry.async("string");
  }

  throw new Error(
    "The .lottie archive does not contain an animation JSON file.",
  );
}

type LottieMeta = {
  w?: number;
  h?: number;
  fr?: number;
  ip?: number;
  op?: number;
  durationSec?: number;
  layers?: number;
  name?: string;
};

type CompatibilityCheck = {
  canSendAsSticker: boolean;
  warnings: string[];
};

export function parseAndInspectLottie(jsonText: string): {
  jsonText: string;
  json: any;
  meta: LottieMeta;
} {
  const json = JSON.parse(jsonText);

  if (!json || typeof json !== "object") throw new Error("Invalid JSON");
  if (
    !("v" in json) ||
    !("w" in json) ||
    !("h" in json) ||
    !("layers" in json)
  ) {
    throw new Error("This does not look like a Lottie JSON.");
  }

  const w = typeof json.w === "number" ? json.w : undefined;
  const h = typeof json.h === "number" ? json.h : undefined;
  const fr = typeof json.fr === "number" ? json.fr : undefined;
  const ip = typeof json.ip === "number" ? json.ip : undefined;
  const op = typeof json.op === "number" ? json.op : undefined;
  const layers = Array.isArray(json.layers) ? json.layers.length : undefined;
  const name = typeof json.nm === "string" ? json.nm : undefined;

  let durationSec: number | undefined;
  if (
    typeof fr === "number" &&
    typeof ip === "number" &&
    typeof op === "number" &&
    fr > 0
  ) {
    durationSec = Math.max(0, (op - ip) / fr);
  }

  return {
    jsonText,
    json,
    meta: { w, h, fr, ip, op, durationSec, layers, name },
  };
}

export function inspectTelegramCompatibility(
  json: any,
  meta: LottieMeta,
  tgsBytes: number,
): CompatibilityCheck {
  const warnings: string[] = [];
  let canSendAsSticker = true;

  if (meta.w !== 512 || meta.h !== 512) {
    warnings.push(
      `canvas ${meta.w ?? "?"}x${meta.h ?? "?"}; Telegram stickers must be 512x512`,
    );
    canSendAsSticker = false;
  }

  if (typeof meta.durationSec === "number" && meta.durationSec > 3) {
    warnings.push(
      `duration ${meta.durationSec.toFixed(2)}s; Telegram stickers must be 3s or less`,
    );
    canSendAsSticker = false;
  }

  if (typeof meta.fr === "number" && meta.fr !== 60) {
    warnings.push(
      `frame rate ${meta.fr}fps; Telegram animated stickers must be exactly 60fps`,
    );
    canSendAsSticker = false;
  }

  if (tgsBytes > 64 * 1024) {
    warnings.push(
      `compressed size ${(tgsBytes / 1024).toFixed(1)}KB; Telegram stickers must be under 64KB`,
    );
    canSendAsSticker = false;
  }

  const layers = Array.isArray(json.layers) ? json.layers : [];
  const imageAssets = Array.isArray(json.assets)
    ? json.assets.filter(
        (asset: any) => typeof asset?.p === "string" || asset?.e === 1,
      ).length
    : 0;
  if (imageAssets > 0) {
    warnings.push(
      `contains ${imageAssets} image asset(s); Telegram animated stickers must be vector-only`,
    );
    canSendAsSticker = false;
  }

  return { canSendAsSticker, warnings };
}

function buildCaption(
  meta: LottieMeta,
  tgsBytes: number,
  compatibility?: CompatibilityCheck,
) {
  const parts = [
    `${meta.w ?? "?"}x${meta.h ?? "?"}`,
    meta.fr != null ? `${meta.fr}fps` : null,
    meta.durationSec != null ? `${meta.durationSec.toFixed(2)}s` : null,
    meta.layers != null ? `layers: ${meta.layers}` : null,
    tgsBytes ? `tgs: ${(tgsBytes / 1024).toFixed(1)}KB` : null,
  ].filter(Boolean);

  const warnings: string[] = [];
  if (meta.w !== 512 || meta.h !== 512)
    warnings.push(`canvas ${meta.w ?? "?"}x${meta.h ?? "?"} (usually 512x512)`);
  if (typeof meta.fr === "number" && meta.fr !== 60)
    warnings.push(`fps ${meta.fr} (Telegram requires 60)`);
  if (typeof meta.durationSec === "number" && meta.durationSec > 3)
    warnings.push(`long ${meta.durationSec.toFixed(2)}s`);
  if (compatibility?.warnings.length) warnings.push(...compatibility.warnings);

  const lines = [
    "🧩 Here is your .tgs file",
    `📊 ${parts.join(" · ")}`,
    warnings.length ? `⚠️ ${warnings.join(", ")}` : null,
    meta.name ? `🏷️ ${meta.name}` : null,
  ].filter(Boolean);

  const caption = lines.join("\n");
  return caption.length > 1024 ? caption.slice(0, 1020) + "…" : caption;
}

export async function lottieFileToTgsSticker(ctx: Context, fileId: string) {
  const userId = ctx.from?.id;
  if (!userId) throw new Error("No userId passed.");

  const documentFileName = ctx.message?.document?.file_name;
  const sourceType = documentFileName?.toLowerCase().endsWith(".lottie")
    ? "lottie"
    : "json";
  const file = await ctx.api.getFile(fileId);
  if (!file.file_path) throw new Error("Telegram file_path is empty.");

  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not set.");

  try {
    logProductEvent(userId, "conversion_started", {
      source_type: sourceType,
      target_type: "tgs",
    });
    const url = getTelegramFileUrl(token, file.file_path);
    const buf = await downloadAsBuffer(url);
    const jsonText = await extractLottieJson(buf, documentFileName);

    const parsed = parseAndInspectLottie(jsonText);
    const normalizedPositionTracks = normalizeTelegramPositionEasing(
      parsed.json,
    );
    const telegramJsonText =
      normalizedPositionTracks > 0 ? JSON.stringify(parsed.json) : jsonText;
    const { json, meta } = parseAndInspectLottie(telegramJsonText);

    // .tgs = gzip(Lottie JSON)
    const tgs = gzipSync(Buffer.from(telegramJsonText, "utf-8"), { level: 9 });
    const compatibility = inspectTelegramCompatibility(
      json,
      meta,
      tgs.byteLength,
    );
    const caption = buildCaption(meta, tgs.byteLength, compatibility);

    if (!compatibility.canSendAsSticker) {
      autoFixStore.set(userId, { jsonText, sourceType });
      await ctx.reply(
        [
          "Telegram will not accept this file as an animated sticker.",
          "I sent the converted .tgs as a file instead.",
        ].join("\n"),
      );
      const sentDocument = await replyWithTgsDocument(ctx, tgs, caption);
      recordSentResult({
        telegramUserId: userId,
        message: sentDocument,
        sourceType,
        targetType: "tgs",
        fileName: "sticker.tgs",
      });

      logConversion({
        telegramUserId: userId,
        sourceType,
        targetType: "tgs",
        success: false,
        outcome: "completed_with_warnings",
        errorMessage: compatibility.warnings.join("; "),
      });

      logProductEvent(userId, "autofix_offered", {
        source_type: sourceType,
        warnings: compatibility.warnings,
      });
      await ctx.reply(
        tr(
          ctx,
          "I can try to resize, shorten, reduce FPS and compact this animation automatically.",
          "Я могу автоматически изменить размер, сократить длительность, снизить FPS и сжать анимацию.",
        ),
        {
          reply_markup: new InlineKeyboard().text(
            tr(ctx, "✨ Fix automatically", "✨ Исправить автоматически"),
            "autofix:latest",
          ),
        },
      );

      await sendDonationPromptSafely(ctx);
      return;
    }

    await ctx.reply(caption);
    try {
      const sentSticker = await ctx.replyWithSticker(
        new InputFile(tgs, "sticker.tgs"),
      );
      if (sentSticker.sticker?.file_id) {
        resultStore.set(userId, {
          fileId: sentSticker.sticker.file_id,
          emoji: "✨",
        });
      }
      recordSentResult({
        telegramUserId: userId,
        message: sentSticker,
        sourceType,
        targetType: "tgs",
        fileName: "sticker.tgs",
        emoji: "✨",
      });
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Telegram rejected the sticker upload";
      await ctx.reply(
        [
          "Telegram rejected this .tgs as a sticker.",
          "I sent the converted .tgs as a file instead.",
          `Reason: ${message}`,
        ].join("\n"),
      );
      const sentDocument = await replyWithTgsDocument(ctx, tgs, caption);
      recordSentResult({
        telegramUserId: userId,
        message: sentDocument,
        sourceType,
        targetType: "tgs",
        fileName: "sticker.tgs",
      });

      logConversion({
        telegramUserId: userId,
        sourceType,
        targetType: "tgs",
        success: false,
        outcome: "rejected_by_telegram",
        errorMessage: message,
      });

      await sendDonationPromptSafely(ctx);
      return;
    }

    logConversion({
      telegramUserId: userId,
      sourceType,
      targetType: "tgs",
      success: true,
    });

    logProductEvent(userId, "conversion_completed", {
      source_type: sourceType,
      target_type: "tgs",
      telegram_compatible: true,
    });

    await sendPostConversionMessages(ctx, { canAddToPack: true });
  } catch (error) {
    logConversion({
      telegramUserId: userId,
      sourceType,
      targetType: "tgs",
      success: false,
      outcome: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Unknown processing error",
    });
    logProductEvent(userId, "conversion_failed", {
      source_type: sourceType,
      target_type: "tgs",
      error:
        error instanceof Error ? error.message : "Unknown processing error",
    });
    throw error;
  }
}

export { autoFixLottieJson } from "./lottieAutoFix.js";
export { replyWithTgsDocument } from "./tgsDocument.js";
