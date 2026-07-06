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

const startServer = async () => {
  await setBotCommands();

  bot.use(async (ctx, next) => {
    if (ctx.from) {
      upsertTelegramUser(ctx.from);
    }

    await next();
  });

  bot.command("convert", convertCommand);
  bot.command("download_pack", downloadPackCommand);
  bot.command("stats", statsCommand);
  bot.command("users", usersCommand);
  bot.command("broadcast", broadcastCommand);

  bot.command("start", (ctx) => {
    ctx.reply(
      [
        "👋 Hi! Send me a .json or .lottie file and I will return a .tgs sticker.",
        "You can also send a simple .svg file and I will try to convert it to .tgs.",
        "Use /convert to choose how animated .tgs stickers should be exported.",
        "Use /download_pack to download a full sticker pack.",
      ].join("\n"),
    );
  });

  bot.callbackQuery(/^mode:(tgs2lottie|lottie2tgs)$/, modeCBQ);
  bot.callbackQuery(/^format:(lottie|json)$/, formatCBQ);
  bot.callbackQuery(/^users:(\d+)$/, usersCBQ);

  bot.on("message:sticker", stickerHandler);
  bot.on("message:text", textHandler);

  // для Lottie JSON файлов
  bot.on("message:document", documentHandler);

  bot.start();
};

startServer();
