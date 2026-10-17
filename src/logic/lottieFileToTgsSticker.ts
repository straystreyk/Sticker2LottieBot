import type { Context } from "grammy";
import { InlineKeyboard, InputFile } from "grammy";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { logConversion, logProductEvent } from "../db/database.js";
import { autoFixStore } from "../store/autoFixStore.js";
import { resultStore } from "../store/resultStore.js";
import { sendDonationPromptSafely, sendPostConversionMessages } from "./resultActions.js";
import { tr } from "../i18n.js";
import { recordSentResult } from "./conversionHistory.js";

function getTelegramFileUrl(token: string, filePath: string) {
    return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function downloadAsBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
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

    const fallbackEntry = zip.file(/\.json$/i).find((entry) => !entry.dir && entry.name !== "manifest.json");
    if (fallbackEntry) {
        return fallbackEntry.async("string");
    }

    throw new Error("The .lottie archive does not contain an animation JSON file.");
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

export function parseAndInspectLottie(jsonText: string): { jsonText: string; json: any; meta: LottieMeta } {
    const json = JSON.parse(jsonText);

    if (!json || typeof json !== "object") throw new Error("Invalid JSON");
    if (!("v" in json) || !("w" in json) || !("h" in json) || !("layers" in json)) {
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
    if (typeof fr === "number" && typeof ip === "number" && typeof op === "number" && fr > 0) {
        durationSec = Math.max(0, (op - ip) / fr);
    }

    return {
        jsonText,
        json,
        meta: { w, h, fr, ip, op, durationSec, layers, name },
    };
}

export function inspectTelegramCompatibility(json: any, meta: LottieMeta, tgsBytes: number): CompatibilityCheck {
    const warnings: string[] = [];
    let canSendAsSticker = true;

    if (meta.w !== 512 || meta.h !== 512) {
        warnings.push(`canvas ${meta.w ?? "?"}x${meta.h ?? "?"}; Telegram stickers must be 512x512`);
        canSendAsSticker = false;
    }

    if (typeof meta.durationSec === "number" && meta.durationSec > 3) {
        warnings.push(`duration ${meta.durationSec.toFixed(2)}s; Telegram stickers must be 3s or less`);
        canSendAsSticker = false;
    }

    if (typeof meta.fr === "number" && meta.fr > 60) {
        warnings.push(`frame rate ${meta.fr}fps; Telegram stickers must be 60fps or less`);
        canSendAsSticker = false;
    }

    if (tgsBytes > 64 * 1024) {
        warnings.push(`compressed size ${(tgsBytes / 1024).toFixed(1)}KB; Telegram stickers must be under 64KB`);
        canSendAsSticker = false;
    }

    const layers = Array.isArray(json.layers) ? json.layers : [];
    const imageAssets = Array.isArray(json.assets)
        ? json.assets.filter((asset: any) => typeof asset?.p === "string" || asset?.e === 1).length
        : 0;
    if (imageAssets > 0) {
        warnings.push(`contains ${imageAssets} image asset(s); Telegram animated stickers must be vector-only`);
        canSendAsSticker = false;
    }

    return { canSendAsSticker, warnings };
}

function buildCaption(meta: LottieMeta, tgsBytes: number, compatibility?: CompatibilityCheck) {
    const parts = [
        `${meta.w ?? "?"}x${meta.h ?? "?"}`,
        meta.fr != null ? `${meta.fr}fps` : null,
        meta.durationSec != null ? `${meta.durationSec.toFixed(2)}s` : null,
        meta.layers != null ? `layers: ${meta.layers}` : null,
        tgsBytes ? `tgs: ${(tgsBytes / 1024).toFixed(1)}KB` : null,
    ].filter(Boolean);

    const warnings: string[] = [];
    if (meta.w !== 512 || meta.h !== 512) warnings.push(`canvas ${meta.w ?? "?"}x${meta.h ?? "?"} (usually 512x512)`);
    if (typeof meta.fr === "number" && meta.fr > 60) warnings.push(`high fps ${meta.fr} (consider 30/60)`);
    if (typeof meta.durationSec === "number" && meta.durationSec > 3) warnings.push(`long ${meta.durationSec.toFixed(2)}s`);
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

export async function replyWithTgsDocument(ctx: Context, tgs: Buffer, caption: string) {
    const dir = await mkdtemp(join(tmpdir(), "sticker2lottie-"));
    const filePath = join(dir, "sticker.tgs");

    try {
        await writeFile(filePath, tgs);
        return await ctx.replyWithDocument(new InputFile(filePath), {
            caption,
            disable_content_type_detection: true,
        });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

export async function lottieFileToTgsSticker(ctx: Context, fileId: string) {
    const userId = ctx.from?.id;
    if (!userId) throw new Error("No userId passed.");

    const documentFileName = ctx.message?.document?.file_name;
    const sourceType = documentFileName?.toLowerCase().endsWith(".lottie") ? "lottie" : "json";
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) throw new Error("Telegram file_path is empty.");

    const token = process.env.BOT_TOKEN;
    if (!token) throw new Error("BOT_TOKEN is not set.");

    try {
        logProductEvent(userId, "conversion_started", { source_type: sourceType, target_type: "tgs" });
        const url = getTelegramFileUrl(token, file.file_path);
        const buf = await downloadAsBuffer(url);
        const jsonText = await extractLottieJson(buf, documentFileName);

        const { json, meta } = parseAndInspectLottie(jsonText);

        // .tgs = gzip(Lottie JSON)
        const tgs = gzipSync(Buffer.from(jsonText, "utf-8"), { level: 9 });
        const compatibility = inspectTelegramCompatibility(json, meta, tgs.byteLength);
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
            await ctx.reply(tr(
                ctx,
                "I can try to resize, shorten, reduce FPS and compact this animation automatically.",
                "Я могу автоматически изменить размер, сократить длительность, снизить FPS и сжать анимацию.",
            ), {
                reply_markup: new InlineKeyboard().text(tr(ctx, "✨ Fix automatically", "✨ Исправить автоматически"), "autofix:latest"),
            });

            await sendDonationPromptSafely(ctx);
            return;
        }

        await ctx.reply(caption);
        try {
            const sentSticker = await ctx.replyWithSticker(new InputFile(tgs, "sticker.tgs"));
            if (sentSticker.sticker?.file_id) {
                resultStore.set(userId, { fileId: sentSticker.sticker.file_id, emoji: "✨" });
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
            const message = sendError instanceof Error ? sendError.message : "Telegram rejected the sticker upload";
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
            errorMessage: error instanceof Error ? error.message : "Unknown processing error",
        });
        logProductEvent(userId, "conversion_failed", {
            source_type: sourceType,
            target_type: "tgs",
            error: error instanceof Error ? error.message : "Unknown processing error",
        });
        throw error;
    }
}

function scaleTranslateValues(values: number[], scale: number, offsetX: number, offsetY: number) {
    return [
        (values[0] ?? 0) * scale + offsetX,
        (values[1] ?? 0) * scale + offsetY,
        ...values.slice(2),
    ];
}

function scaleValues(values: number[], scale: number) {
    return [
        (values[0] ?? 0) * scale,
        (values[1] ?? 0) * scale,
        ...values.slice(2),
    ];
}

function isSplitDimensionProperty(property: any) {
    return (
        !!property &&
        typeof property.k === "object" &&
        property.k !== null &&
        !Array.isArray(property.k)
    );
}

function scaleSplitDimensionComponent(property: any, axis: "x" | "y", transform: (v: number) => number) {
    if (!property || typeof property !== "object") return;
    const component = property.k?.[axis];
    if (!component || typeof component !== "object") return;

    if (typeof component.k === "number") {
        component.k = transform(component.k);
        return;
    }
    if (Array.isArray(component.k)) {
        for (const keyframe of component.k) {
            if (!keyframe || typeof keyframe !== "object") continue;
            if (Array.isArray(keyframe.s)) keyframe.s = [transform(keyframe.s[0] ?? 0)];
            if (Array.isArray(keyframe.e)) keyframe.e = [transform(keyframe.e[0] ?? 0)];
        }
    }
}

function scaleSpatialTangents(property: any, scale: number) {
    if (!property || !Array.isArray(property.k)) return;
    for (const keyframe of property.k) {
        if (!keyframe || typeof keyframe !== "object") continue;
        for (const tangentKey of ["to", "ti"] as const) {
            const tangent = keyframe[tangentKey];
            if (Array.isArray(tangent) && tangent.every((x: unknown) => typeof x === "number")) {
                keyframe[tangentKey] = tangent.map((x: number) => x * scale);
            }
        }
    }
}

function transformVectorProperty(
    property: any,
    transform: (value: number[], kind: "start" | "end") => number[],
) {
    if (!property || !Array.isArray(property.k)) return;
    if (property.k.every((item: unknown) => typeof item === "number")) {
        property.k = transform(property.k, "start");
        return;
    }

    for (const keyframe of property.k) {
        if (!keyframe || typeof keyframe !== "object") continue;
        if (Array.isArray(keyframe.s)) keyframe.s = transform(keyframe.s, "start");
        if (Array.isArray(keyframe.e)) keyframe.e = transform(keyframe.e, "end");
    }
}

function scaleAnimationTimes(value: any, factor: number) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
        for (const item of value) scaleAnimationTimes(item, factor);
        return;
    }

    if (typeof value.t === "number" && (Array.isArray(value.s) || Array.isArray(value.e))) {
        value.t *= factor;
    }
    for (const child of Object.values(value)) scaleAnimationTimes(child, factor);
}

export function autoFixLottieJson(jsonText: string) {
    const json = JSON.parse(jsonText);
    const changes: string[] = [];

    const width = typeof json.w === "number" && json.w > 0 ? json.w : 512;
    const height = typeof json.h === "number" && json.h > 0 ? json.h : 512;
    if (width !== 512 || height !== 512) {
        // Proportional fit: one uniform scale factor (longest side → 512),
        // then center the content on the 512x512 canvas. Rotation, anchor
        // points and child layers keep working because the scale is applied
        // once, at the top of every parent chain.
        const scale = 512 / Math.max(width, height);
        const offsetX = (512 - width * scale) / 2;
        const offsetY = (512 - height * scale) / 2;

        for (const layer of Array.isArray(json.layers) ? json.layers : []) {
            if (layer?.parent != null) continue; // children inherit the scaled parent space
            const ks = layer?.ks ?? (layer.ks = {});

            // Position: scale + centering offset (static, keyframed or split-dimension).
            if (isSplitDimensionProperty(ks.p)) {
                scaleSplitDimensionComponent(ks.p, "x", (v) => v * scale + offsetX);
                scaleSplitDimensionComponent(ks.p, "y", (v) => v * scale + offsetY);
            } else if (ks.p && Array.isArray(ks.p.k)) {
                transformVectorProperty(ks.p, (values) => scaleTranslateValues(values, scale, offsetX, offsetY));
                scaleSpatialTangents(ks.p, scale);
            } else if (offsetX !== 0 || offsetY !== 0) {
                ks.p = { a: 0, k: [offsetX, offsetY, 0] };
            }

            // Scale: multiply percentages; when absent (default 100%) it must be added,
            // otherwise rig null layers would leave the content unscaled.
            if (isSplitDimensionProperty(ks.s)) {
                scaleSplitDimensionComponent(ks.s, "x", (v) => v * scale);
                scaleSplitDimensionComponent(ks.s, "y", (v) => v * scale);
            } else if (ks.s && Array.isArray(ks.s.k)) {
                transformVectorProperty(ks.s, (values) => scaleValues(values, scale));
            } else {
                ks.s = { a: 0, k: [100 * scale, 100 * scale, 100] };
            }
        }
        json.w = 512;
        json.h = 512;
        changes.push(`canvas ${width}x${height} → 512x512 (proportional fit)`);
    }

    if (typeof json.fr === "number" && json.fr > 60) {
        const factor = 60 / json.fr;
        if (typeof json.ip === "number") json.ip *= factor;
        if (typeof json.op === "number") json.op *= factor;
        for (const layer of Array.isArray(json.layers) ? json.layers : []) {
            if (typeof layer.ip === "number") layer.ip *= factor;
            if (typeof layer.op === "number") layer.op *= factor;
            if (typeof layer.st === "number") layer.st *= factor;
        }
        scaleAnimationTimes(json.layers, factor);
        changes.push(`fps ${json.fr} → 60`);
        json.fr = 60;
    }

    if (
        typeof json.fr === "number" &&
        json.fr > 0 &&
        typeof json.ip === "number" &&
        typeof json.op === "number" &&
        (json.op - json.ip) / json.fr > 3
    ) {
        json.op = json.ip + json.fr * 3;
        changes.push("duration → 3s");
    }

    return { jsonText: JSON.stringify(json), changes };
}
