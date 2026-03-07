import { CONFIG } from "./config.js";

export function isAdmin(userId?: number) {
  return typeof userId === "number" && CONFIG.adminUserIds.includes(userId);
}
