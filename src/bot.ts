import { Bot } from "grammy";
import { CONFIG } from "./config.js";

const bot = new Bot(CONFIG.botToken);

const setBotCommands = async () => {
  await bot.api.setMyCommands([
    {
      command: "start",
      description: "Get BOT Menu",
    },
    {
      command: "convert",
      description: "Convert .tgs to lottie or lottie to .tgs",
    },
  ]);
};

export { setBotCommands };
export default bot;
