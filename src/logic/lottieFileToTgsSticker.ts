import type { Context } from "grammy";
import { InputFile } from "grammy";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { logConversion } from "../db/database.js";
import { sendDonationPrompt } from "./sendDonationPrompt.js";

function getTelegramFileUrl(token: string, filePath: string) {
    return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function downloadAsBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
}

async function extractLottieJson(buf: Buffer, fileName?: string) {
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

function parseAndInspectLottie(jsonText: string): { jsonText: string; json: any; meta: LottieMeta } {
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

function inspectTelegramCompatibility(json: any, meta: LottieMeta, tgsBytes: number): CompatibilityCheck {
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

async function replyWithTgsDocument(ctx: Context, tgs: Buffer, caption: string) {
    const dir = await mkdtemp(join(tmpdir(), "sticker2lottie-"));
    const filePath = join(dir, "sticker.tgs");

    try {
        await writeFile(filePath, tgs);
        await ctx.replyWithDocument(new InputFile(filePath), {
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
        const url = getTelegramFileUrl(token, file.file_path);
        const buf = await downloadAsBuffer(url);
        const jsonText = await extractLottieJson(buf, documentFileName);

        const { json, meta } = parseAndInspectLottie(jsonText);

        // .tgs = gzip(Lottie JSON)
        const tgs = gzipSync(Buffer.from(jsonText, "utf-8"), { level: 9 });
        const compatibility = inspectTelegramCompatibility(json, meta, tgs.byteLength);
        const caption = buildCaption(meta, tgs.byteLength, compatibility);

        if (!compatibility.canSendAsSticker) {
            await ctx.reply(
                [
                    "Telegram will not accept this file as an animated sticker.",
                    "I sent the converted .tgs as a file instead.",
                ].join("\n"),
            );
            await replyWithTgsDocument(ctx, tgs, caption);

            logConversion({
                telegramUserId: userId,
                sourceType,
                targetType: "tgs",
                success: false,
                errorMessage: compatibility.warnings.join("; "),
            });

            await sendDonationPrompt(ctx);
            return;
        }

        await ctx.reply(caption);
        try {
            await ctx.replyWithSticker(new InputFile(tgs, "sticker.tgs"));
        } catch (sendError) {
            const message = sendError instanceof Error ? sendError.message : "Telegram rejected the sticker upload";
            await ctx.reply(
                [
                    "Telegram rejected this .tgs as a sticker.",
                    "I sent the converted .tgs as a file instead.",
                    `Reason: ${message}`,
                ].join("\n"),
            );
            await replyWithTgsDocument(ctx, tgs, caption);

            logConversion({
                telegramUserId: userId,
                sourceType,
                targetType: "tgs",
                success: false,
                errorMessage: message,
            });

            await sendDonationPrompt(ctx);
            return;
        }

        logConversion({
            telegramUserId: userId,
            sourceType,
            targetType: "tgs",
            success: true,
        });

        await sendDonationPrompt(ctx);
    } catch (error) {
        logConversion({
            telegramUserId: userId,
            sourceType,
            targetType: "tgs",
            success: false,
            errorMessage: error instanceof Error ? error.message : "Unknown processing error",
        });
        throw error;
    }
}
