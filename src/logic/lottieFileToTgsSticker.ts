import type { Context } from "grammy";
import { InputFile } from "grammy";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { logConversion } from "../db/database.js";

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

function buildCaption(meta: LottieMeta, tgsBytes: number) {
    const parts = [
        `${meta.w ?? "?"}×${meta.h ?? "?"}`,
        meta.fr != null ? `${meta.fr}fps` : null,
        meta.durationSec != null ? `${meta.durationSec.toFixed(2)}s` : null,
        meta.layers != null ? `layers: ${meta.layers}` : null,
        tgsBytes ? `tgs: ${(tgsBytes / 1024).toFixed(1)}KB` : null,
    ].filter(Boolean);

    const warnings: string[] = [];
    if (meta.w !== 512 || meta.h !== 512) warnings.push(`canvas ${meta.w ?? "?"}×${meta.h ?? "?"} (usually 512×512)`);
    if (typeof meta.fr === "number" && meta.fr > 60) warnings.push(`high fps ${meta.fr} (consider 30/60)`);
    if (typeof meta.durationSec === "number" && meta.durationSec > 3) warnings.push(`long ${meta.durationSec.toFixed(2)}s`);

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
    const sourceType = documentFileName?.toLowerCase().endsWith(".lottie") ? "lottie" : "json";
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) throw new Error("Telegram file_path is empty.");

    const token = process.env.BOT_TOKEN;
    if (!token) throw new Error("BOT_TOKEN is not set.");

    try {
        const url = getTelegramFileUrl(token, file.file_path);
        const buf = await downloadAsBuffer(url);
        const jsonText = await extractLottieJson(buf, documentFileName);

        const { meta } = parseAndInspectLottie(jsonText);

        // .tgs = gzip(Lottie JSON)
        const tgs = gzipSync(Buffer.from(jsonText, "utf-8"), { level: 9 });

        // ✅ send as DOCUMENT so we can attach caption (stickers cannot have captions)
        await ctx.reply(buildCaption(meta, tgs.byteLength))
        await ctx.replyWithSticker(new InputFile(tgs, "sticker.tgs"));

        logConversion({
            telegramUserId: userId,
            sourceType,
            targetType: "tgs",
            success: true,
        });
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
