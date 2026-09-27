import { Bot } from "grammy";
import { CONFIG } from "./config.js";
import { logError, logInfo, logWarn } from "./logger.js";

const botToken = CONFIG.botToken.trim();
if (!botToken) {
  const error = new Error(
    "BOT_TOKEN is empty. Add BOT_TOKEN to .env or .compose.env.",
  );
  logError("config.invalid", error, { variable: "BOT_TOKEN" });
  throw error;
}

const bot = new Bot(botToken);

const setBotCommands = async () => {
  const commands = [
    {
      command: "start",
      description: "Open the main menu",
    },
    {
      command: "convert",
      description: "Choose the default TGS output",
    },
    {
      command: "download_pack",
      description: "Download all stickers from a sticker pack",
    },
    {
      command: "settings",
      description: "Language, format and notification settings",
    },
    {
      command: "help",
      description: "Supported files and usage help",
    },
    {
      command: "paysupport",
      description: "Help with Telegram Stars payments",
    },
    {
      command: "support",
      description: "Support the bot with Stars or TON",
    },
    {
      command: "my",
      description: "Open saved conversion results",
    },
    {
      command: "doctor",
      description: "Check a sticker, file or sticker pack",
    },
    {
      command: "pack_builder",
      description: "Build and publish a sticker pack",
    },
  ];

  try {
    await bot.api.setMyCommands(commands);
    logInfo("commands.registered", {
      scope: "default",
      count: commands.length,
    });
  } catch (error) {
    logError("commands.registration_failed", error, { scope: "default" });
  }

  try {
    await bot.api.setMyCommands(
      [
        { command: "start", description: "Открыть главное меню" },
        { command: "convert", description: "Выбрать формат для TGS" },
        {
          command: "download_pack",
          description: "Скачать или конвертировать стикерпак",
        },
        { command: "settings", description: "Язык, формат и уведомления" },
        { command: "help", description: "Поддерживаемые файлы и помощь" },
        {
          command: "paysupport",
          description: "Помощь с платежами Telegram Stars",
        },
        {
          command: "support",
          description: "Поддержать бота Stars или TON",
        },
        { command: "my", description: "Открыть сохранённые результаты" },
        { command: "doctor", description: "Проверить файл или стикерпак" },
        {
          command: "pack_builder",
          description: "Собрать и опубликовать стикерпак",
        },
      ],
      { language_code: "ru" },
    );
    logInfo("commands.registered", { scope: "default", language: "ru" });
  } catch (error) {
    logError("commands.registration_failed", error, {
      scope: "default",
      language: "ru",
    });
  }

  const adminCommands = [
    ...commands,
    {
      command: "stats",
      description: "Show bot usage stats",
    },
    {
      command: "users",
      description: "Show users list",
    },
    {
      command: "broadcast",
      description: "Broadcast replied message",
    },
  ];

  for (const adminUserId of CONFIG.adminUserIds) {
    try {
      await bot.api.setMyCommands(adminCommands, {
        scope: { type: "chat", chat_id: adminUserId },
      });
      logInfo("commands.registered", {
        scope: "admin_chat",
        admin_user_id: adminUserId,
      });
    } catch (error) {
      logWarn("commands.admin_registration_failed", {
        admin_user_id: adminUserId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

export { setBotCommands };
export default bot;
