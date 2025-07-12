import { convertCommand } from "./commands/convert";
import { formatCBQ } from "./cbq/formatCBQ";
import { stickerToFile } from "./logic/stickerToFile";
import bot, { setBotCommands } from "./bot";

const startServer = async () => {
  await setBotCommands();

  // Команда для запуска выбора формата
  bot.command("convert", convertCommand);

  // Обработка нажатия на кнопку выбора формата
  bot.callbackQuery(/^format:(lottie|json)$/, formatCBQ);

  // Обработка стикера
  bot.on("message:sticker", stickerToFile);

  // Старт
  bot.command("start", (ctx) => {
    ctx.reply(
      "👋 Привет! Используй команду /convert, чтобы выбрать формат и отправить мне стикер в .tgs для конвертации.",
    );
  });

  bot.start();
};

startServer();
