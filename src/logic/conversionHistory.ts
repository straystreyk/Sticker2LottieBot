import type { Message } from "grammy/types";
import { recordConversionResult } from "../db/database.js";

export type SentResultDetails = {
  telegramUserId: number;
  message: Message;
  sourceType: string;
  targetType: string;
  fileName?: string;
  emoji?: string;
};

export function recordSentResult(details: SentResultDetails) {
  const sticker = details.message.sticker;
  const document = details.message.document;
  const telegramFileId = sticker?.file_id ?? document?.file_id;
  if (!telegramFileId) return null;

  return recordConversionResult({
    telegramUserId: details.telegramUserId,
    telegramFileId,
    telegramFileUniqueId: sticker?.file_unique_id ?? document?.file_unique_id,
    outputKind: sticker ? "sticker" : "document",
    fileName: details.fileName ?? document?.file_name,
    sourceType: details.sourceType,
    targetType: details.targetType,
    emoji: details.emoji ?? sticker?.emoji ?? "✨",
  });
}
