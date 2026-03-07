import type { Context } from "grammy";
import { isAdmin } from "../admin.js";
import { getAllTelegramUserIds } from "../db/database.js";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function broadcastCommand(ctx: Context) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!isAdmin(userId)) {
    return ctx.reply("This command is available only for bot admins.");
  }

  if (!chatId) {
    return ctx.reply("Unable to resolve chat for broadcast.");
  }

  const replyToMessage = ctx.message?.reply_to_message;
  if (!replyToMessage) {
    return ctx.reply("Use /broadcast as a reply to the message you want to send to all users.");
  }

  const userIds = getAllTelegramUserIds().filter((id) => id !== userId);
  if (userIds.length === 0) {
    return ctx.reply("No users found for broadcast.");
  }

  const statusMessage = await ctx.reply(
    `Broadcast started.\nUsers: ${userIds.length}\nBatch size: ${BATCH_SIZE}`,
  );

  let sent = 0;
  let failed = 0;

  for (let offset = 0; offset < userIds.length; offset += BATCH_SIZE) {
    const batch = userIds.slice(offset, offset + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((targetUserId) =>
        ctx.api.copyMessage(targetUserId, chatId, replyToMessage.message_id),
      ),
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        sent += 1;
      } else {
        failed += 1;
      }
    });

    await ctx.api.editMessageText(
      chatId,
      statusMessage.message_id,
      [
        "Broadcast in progress",
        `Users: ${userIds.length}`,
        `Processed: ${Math.min(offset + batch.length, userIds.length)}`,
        `Sent: ${sent}`,
        `Failed: ${failed}`,
      ].join("\n"),
    );

    if (offset + BATCH_SIZE < userIds.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return ctx.api.editMessageText(
    chatId,
    statusMessage.message_id,
    [
      "Broadcast finished",
      `Users: ${userIds.length}`,
      `Sent: ${sent}`,
      `Failed: ${failed}`,
      `Batch size: ${BATCH_SIZE}`,
    ].join("\n"),
  );
}
