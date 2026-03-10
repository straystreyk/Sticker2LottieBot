import { Bot } from "grammy";
import { CONFIG } from "./config.js";

const bot = new Bot(CONFIG.botToken);

const setBotCommands = async () => {
  const commands = [
    {
      command: "start",
      description: "Get BOT Menu",
    },
    {
      command: "convert",
      description: "Convert .tgs to lottie or lottie to .tgs",
    },
    {
      command: "download_pack",
      description: "Download all stickers from a sticker pack",
    },
  ];

  if (CONFIG.adminUserIds.length > 0) {
    commands.push({
      command: "stats",
      description: "Show bot usage stats",
    });
    commands.push({
      command: "users",
      description: "Show users list",
    });
    commands.push({
      command: "broadcast",
      description: "Broadcast replied message",
    });
  }

  await bot.api.setMyCommands(commands);
};

export { setBotCommands };
export default bot;
