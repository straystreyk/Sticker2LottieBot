import dotenv from "dotenv";

dotenv.config();

const adminUserIds = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => Number(value))
  .filter((value) => Number.isInteger(value) && value > 0);

const configuredStartupTimeout = Number(process.env.BOT_STARTUP_TIMEOUT_MS || "15000");

export const CONFIG = {
  botToken: process.env.BOT_TOKEN || "",
  dbPath: process.env.DB_PATH || "./data/sticker2lottie.sqlite",
  donationTonAddress:
    process.env.DONATION_TON_ADDRESS || "UQCAFHfmY6ov2iMzDJMpDSKcRMyC7VSlJKc8bG5raql7kluE",
  adminUserIds,
  startupTimeoutMs:
    Number.isFinite(configuredStartupTimeout) && configuredStartupTimeout >= 1000
      ? configuredStartupTimeout
      : 15000,
};
