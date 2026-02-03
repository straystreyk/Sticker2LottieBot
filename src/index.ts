import { convertCommand } from "./commands/convert.js";
import { formatCBQ } from "./cbq/formatCBQ.js";
import { modeCBQ } from "./cbq/modeCBQ.js";
import bot, { setBotCommands } from "./bot.js";
import { stickerHandler } from "./handlers/stickerHandler.js";
import { textHandler } from "./handlers/textHandler.js";
import { documentHandler } from "./handlers/documentHandler.js";

const startServer = async () => {
  await setBotCommands();

  bot.command("convert", convertCommand);

  bot.command("start", (ctx) => {
    ctx.reply("👋 Hi! Use /convert to choose a direction and then send me the sticker/file.");
  });

  bot.callbackQuery(/^mode:(tgs2lottie|lottie2tgs)$/, modeCBQ);
  bot.callbackQuery(/^format:(lottie|json)$/, formatCBQ);

  bot.on("message:sticker", stickerHandler);
  bot.on("message:text", textHandler);

  // для Lottie JSON файлов
  bot.on("message:document", documentHandler);

  bot.start();
};

startServer();
