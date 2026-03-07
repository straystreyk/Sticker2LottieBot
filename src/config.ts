import dotenv from "dotenv";

dotenv.config();

const adminUserIds = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => Number(value))
  .filter((value) => Number.isInteger(value) && value > 0);

export const CONFIG = {
  botToken: process.env.BOT_TOKEN || "",
  dbPath: process.env.DB_PATH || "./data/sticker2lottie.sqlite",
  adminUserIds,
};
