import type { Context } from "grammy";
import { InputFile } from "grammy";
import { gunzipSync, gzipSync } from "node:zlib";

function getTelegramFileUrl(token: string, filePath: string) {
    return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function downloadAsBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
}

function ensureValidLottieJson(buf: Buffer) {
    // Быстрая проверка, что это JSON и похоже на Lottie
    const text = buf.toString("utf-8");
    const json = JSON.parse(text);

    // минимальные поля, которые обычно есть у Lottie
    // (не гарантирует валидность для стикеров, но ловит мусор)
    if (!json || typeof json !== "object") throw new Error("Invalid JSON");
    if (!("v" in json) || !("w" in json) || !("h" in json) || !("layers" in json)) {
        throw new Error("This does not look like a Lottie JSON.");
    }

    return json;
}

export async function lottieFileToTgsSticker(ctx: Context, fileId: string) {
    // 1) получаем file_path
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) throw new Error("Telegram file_path is empty.");

    // 2) скачиваем
    const token = process.env.BOT_TOKEN;
    if (!token) throw new Error("BOT_TOKEN is not set.");

    const url = getTelegramFileUrl(token, file.file_path);
    const buf = await downloadAsBuffer(url);

    // 3) проверяем JSON
    ensureValidLottieJson(buf);

    // 4) делаем .tgs = gzip(Lottie JSON)
    const tgs = gzipSync(buf, { level: 9 });

    // 5) отправляем как стикер
    // Telegram принимает .tgs как "animated sticker"
    await ctx.replyWithSticker(new InputFile(tgs, "sticker.tgs"));
}
