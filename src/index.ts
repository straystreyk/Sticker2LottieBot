import { broadcastCommand } from "./commands/broadcast.js";
import { convertCommand } from "./commands/convert.js";
import { downloadPackCommand } from "./commands/downloadPack.js";
import { statsCommand } from "./commands/stats.js";
import { usersCommand } from "./commands/users.js";
import { formatCBQ } from "./cbq/formatCBQ.js";
import { modeCBQ } from "./cbq/modeCBQ.js";
import { usersCBQ } from "./cbq/usersCBQ.js";
import bot, { setBotCommands } from "./bot.js";
import { upsertTelegramUser } from "./db/database.js";
import { stickerHandler } from "./handlers/stickerHandler.js";
import { textHandler } from "./handlers/textHandler.js";
import { documentHandler } from "./handlers/documentHandler.js";
import { startCommand } from "./commands/start.js";
import { helpCommand } from "./commands/help.js";
import { settingsCommand } from "./commands/settings.js";
import { onboardingCBQ } from "./cbq/onboardingCBQ.js";
import {
  settingsFormatCBQ,
  settingsLanguageCBQ,
  settingsNotificationsCBQ,
  settingsOpenCBQ,
} from "./cbq/settingsCBQ.js";
import {
  downloadPackChooseCBQ,
  downloadPackFormatCBQ,
} from "./cbq/downloadPackCBQ.js";
import { stickerPackAddCBQ } from "./cbq/stickerPackCBQ.js";
import { autoFixCBQ } from "./cbq/autoFixCBQ.js";
import { starsSupportCBQ } from "./cbq/starsSupportCBQ.js";
import { paySupportCommand } from "./commands/paySupport.js";
import {
  starsPreCheckoutHandler,
  starsSuccessfulPaymentHandler,
} from "./handlers/starsPaymentHandler.js";
import { sendDonationPrompt } from "./logic/sendDonationPrompt.js";
import { studioCommand } from "./commands/studio.js";
import { doctorCommand } from "./commands/doctor.js";
import { stickerPackBuilderCommand } from "./commands/stickerPackBuilder.js";
import {
  studioFavoriteCBQ,
  studioNoopCBQ,
  studioPageCBQ,
  studioViewCBQ,
} from "./cbq/studioCBQ.js";
import { doctorCancelCBQ, doctorStartCBQ } from "./cbq/doctorCBQ.js";
import {
  stickerPackBuilderAddCBQ,
  stickerPackBuilderClearCBQ,
  stickerPackBuilderEmojiCBQ,
  stickerPackBuilderMoveCBQ,
  stickerPackBuilderNoopCBQ,
  stickerPackBuilderOpenCBQ,
  stickerPackBuilderPublishCBQ,
  stickerPackBuilderRemoveCBQ,
} from "./cbq/stickerPackBuilderCBQ.js";
import {
  chosenInlineResultHandler,
  inlineQueryHandler,
} from "./handlers/inlineQueryHandler.js";
import { CONFIG } from "./config.js";
import { logError, logInfo } from "./logger.js";
import type { Context } from "grammy";
import { AbortController } from "abort-controller";

function getUpdateKind(ctx: Context) {
  if (ctx.preCheckoutQuery) return "pre_checkout_query";
  if (ctx.chosenInlineResult) return "chosen_inline_result";
  if (ctx.callbackQuery) return "callback_query";
  if (ctx.inlineQuery) return "inline_query";
  if (ctx.channelPost) return "channel_post";
  if (ctx.message) return "message";
  return "other";
}

function getMessageKind(ctx: Context) {
  const message = ctx.message;
  if (!message) return undefined;
  if (message.text) return message.text.startsWith("/") ? "command" : "text";
  if (message.sticker) return "sticker";
  if (message.document) return "document";
  if (message.photo) return "photo";
  if (message.video) return "video";
  if (message.animation) return "animation";
  if (message.voice) return "voice";
  if (message.audio) return "audio";
  if (message.successful_payment) return "successful_payment";
  return "other";
}

function getCommand(ctx: Context) {
  const text = ctx.message?.text;
  if (!text?.startsWith("/")) return undefined;
  return text.split(/\s+/, 1)[0].slice(0, 64);
}

const startServer = async () => {
  logInfo("startup.begin", {
    node_env: process.env.NODE_ENV ?? "development",
    node_version: process.version,
    db_path: CONFIG.dbPath,
    bot_token_configured: Boolean(CONFIG.botToken.trim()),
    donation_wallet_configured: Boolean(CONFIG.donationTonAddress.trim()),
    stars_support_enabled: true,
    admin_count: CONFIG.adminUserIds.length,
    startup_timeout_ms: CONFIG.startupTimeoutMs,
    transport: "long_polling",
  });

  const startupAbortController = new AbortController();
  const startupTimeout = setTimeout(
    () => startupAbortController.abort(),
    CONFIG.startupTimeoutMs,
  );
  try {
    await bot.init(startupAbortController.signal);
  } catch (error) {
    if (startupAbortController.signal.aborted) {
      throw new Error(
        `Telegram getMe timed out after ${CONFIG.startupTimeoutMs}ms. Check outbound HTTPS/DNS access to api.telegram.org.`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(startupTimeout);
  }
  logInfo("telegram.authenticated", {
    bot_id: bot.botInfo.id,
    username: `@${bot.botInfo.username}`,
    name: bot.botInfo.first_name,
  });

  bot.use(async (ctx, next) => {
    const startedAt = Date.now();
    let outcome = "failed";
    logInfo("update.received", {
      update_id: ctx.update.update_id,
      update_type: getUpdateKind(ctx),
      message_type: getMessageKind(ctx),
      command: getCommand(ctx),
      user_id: ctx.from?.id,
      chat_id: ctx.chat?.id,
    });

    if (ctx.from) {
      upsertTelegramUser(ctx.from);
    }

    try {
      await next();
      outcome = "completed";
    } finally {
      logInfo("update.processed", {
        update_id: ctx.update.update_id,
        outcome,
        duration_ms: Date.now() - startedAt,
      });
    }
  });

  bot.command("convert", convertCommand);
  bot.command("download_pack", downloadPackCommand);
  bot.command("help", helpCommand);
  bot.command("settings", settingsCommand);
  bot.command("stats", statsCommand);
  bot.command("users", usersCommand);
  bot.command("broadcast", broadcastCommand);
  bot.command("paysupport", paySupportCommand);
  bot.command("support", sendDonationPrompt);
  bot.command("my", studioCommand);
  bot.command("doctor", doctorCommand);
  bot.command("pack_builder", stickerPackBuilderCommand);

  bot.command("start", startCommand);

  bot.callbackQuery(/^mode:(tgs2lottie|lottie2tgs)$/, modeCBQ);
  bot.callbackQuery(/^format:(lottie|json)$/, formatCBQ);
  bot.callbackQuery(/^users:(\d+)$/, usersCBQ);
  bot.callbackQuery(/^onboard:(tgs|file|demo)$/, onboardingCBQ);
  bot.callbackQuery(/^settings:open$/, settingsOpenCBQ);
  bot.callbackQuery(/^settings:format:(lottie|json)$/, settingsFormatCBQ);
  bot.callbackQuery(/^settings:lang:(ru|en)$/, settingsLanguageCBQ);
  bot.callbackQuery(
    /^settings:notifications:(on|off)$/,
    settingsNotificationsCBQ,
  );
  bot.callbackQuery(/^packdl:choose$/, downloadPackChooseCBQ);
  bot.callbackQuery(/^packdl:(files|json|lottie)$/, downloadPackFormatCBQ);
  bot.callbackQuery(/^pack:add$/, stickerPackAddCBQ);
  bot.callbackQuery(/^autofix:latest$/, autoFixCBQ);
  bot.callbackQuery(/^support:stars:(50|100|250)$/, starsSupportCBQ);
  bot.callbackQuery(/^studio:page:(\d+)$/, studioPageCBQ);
  bot.callbackQuery(/^studio:view:(\d+)$/, studioViewCBQ);
  bot.callbackQuery(/^studio:fav:(\d+)$/, studioFavoriteCBQ);
  bot.callbackQuery(/^studio:noop$/, studioNoopCBQ);
  bot.callbackQuery(/^doctor:start$/, doctorStartCBQ);
  bot.callbackQuery(/^doctor:cancel$/, doctorCancelCBQ);
  bot.callbackQuery(/^builder:open$/, stickerPackBuilderOpenCBQ);
  bot.callbackQuery(/^builder:add:(\d+)$/, stickerPackBuilderAddCBQ);
  bot.callbackQuery(/^builder:(up|down):(\d+)$/, stickerPackBuilderMoveCBQ);
  bot.callbackQuery(/^builder:remove:(\d+)$/, stickerPackBuilderRemoveCBQ);
  bot.callbackQuery(/^builder:emoji:(\d+)$/, stickerPackBuilderEmojiCBQ);
  bot.callbackQuery(/^builder:publish$/, stickerPackBuilderPublishCBQ);
  bot.callbackQuery(/^builder:clear$/, stickerPackBuilderClearCBQ);
  bot.callbackQuery(/^builder:noop:(\d+)$/, stickerPackBuilderNoopCBQ);

  bot.on("pre_checkout_query", starsPreCheckoutHandler);
  bot.on("message:successful_payment", starsSuccessfulPaymentHandler);
  bot.on("inline_query", inlineQueryHandler);
  bot.on("chosen_inline_result", chosenInlineResultHandler);

  bot.on("message:sticker", stickerHandler);
  bot.on("message:text", textHandler);

  // для Lottie JSON файлов
  bot.on("message:document", documentHandler);

  bot.catch((botError) => {
    logError("update.failed", botError.error, {
      update_id: botError.ctx.update.update_id,
      update_type: getUpdateKind(botError.ctx),
      user_id: botError.ctx.from?.id,
      chat_id: botError.ctx.chat?.id,
    });
  });

  logInfo("handlers.registered", {
    commands: 13,
    callbacks: 25,
    message_handlers: [
      "pre_checkout_query",
      "successful_payment",
      "inline_query",
      "chosen_inline_result",
      "sticker",
      "text",
      "document",
    ],
  });

  await setBotCommands();

  try {
    const webhook = await bot.api.getWebhookInfo();
    logInfo("telegram.webhook_status", {
      active: Boolean(webhook.url),
      pending_updates: webhook.pending_update_count,
      last_error: webhook.last_error_message,
    });
  } catch (error) {
    logError("telegram.webhook_check_failed", error);
  }

  const shutdown = async (signal: string) => {
    logInfo("shutdown.requested", { signal });
    try {
      await bot.stop();
      logInfo("shutdown.completed", { signal });
    } catch (error) {
      logError("shutdown.failed", error, { signal });
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await bot.start({
    drop_pending_updates: false,
    onStart: (botInfo) => {
      logInfo("bot.started", {
        bot_id: botInfo.id,
        username: `@${botInfo.username}`,
        name: botInfo.first_name,
        transport: "long_polling",
      });
    },
  });

  logInfo("bot.stopped");
};

startServer().catch((error) => {
  logError("startup.failed", error, {
    hint: "Check BOT_TOKEN, network access, Telegram API availability, and whether another process is polling with the same token.",
  });
  process.exitCode = 1;
});

process.on("unhandledRejection", (error) => {
  logError("process.unhandled_rejection", error);
});

process.on("uncaughtException", (error) => {
  logError("process.uncaught_exception", error);
  process.exitCode = 1;
});
