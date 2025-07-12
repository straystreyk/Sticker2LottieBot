import { Bot } from "grammy";
import { CONFIG } from "./config.js";
const bot = new Bot(CONFIG.botToken);
const setBotCommands = async () => {
    await bot.api.setMyCommands([
        {
            command: "start",
            description: "Получить меню с возможностями бота",
        },
        {
            command: "convert",
            description: "Выбрать формат (.lottie или .json)",
        },
    ]);
};
export { setBotCommands };
export default bot;
//# sourceMappingURL=bot.js.map