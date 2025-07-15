import { convertCommand } from "./commands/convert.js";
import { formatCBQ } from "./cbq/formatCBQ.js";
import bot, { setBotCommands } from "./bot.js";
import { stickerHandler } from "./handlers/stickerHandler.js";
import { textHandler } from "./handlers/textHandler.js";

const startServer = async () => {
  await setBotCommands();

  // Команда для запуска выбора формата
  bot.command("convert", convertCommand);

  bot.command("start", (ctx) => {
    ctx.reply(
      "👋 Hi! Use the /convert command to choose a format and send me a .tgs sticker for conversion.",
    );
  });

  // Обработка нажатия на кнопку выбора формата
  bot.callbackQuery(/^format:(lottie|json)$/, formatCBQ);

  // Обработка стикера
  bot.on("message:sticker", stickerHandler);
  bot.on("message:text", textHandler);

  bot.start();
};

startServer();
