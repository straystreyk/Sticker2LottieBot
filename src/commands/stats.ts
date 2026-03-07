import type { Context } from "grammy";
import { isAdmin } from "../admin.js";
import { getAdminStats } from "../db/database.js";

export async function statsCommand(ctx: Context) {
  const userId = ctx.from?.id;
  if (!isAdmin(userId)) {
    return ctx.reply("This command is available only for bot admins.");
  }

  const stats = getAdminStats();
  const topFormats =
    stats.topFormats.length > 0
      ? stats.topFormats.map((item, index) => `${index + 1}. ${item.conversion}: ${item.total}`).join("\n")
      : "No conversions yet.";

  return ctx.reply(
    [
      "Bot stats",
      `Users: ${stats.total_users}`,
      `Active 7d: ${stats.active_users_7d}`,
      `Conversions: ${stats.total_conversions}`,
      `Success: ${stats.successful_conversions}`,
      `Failed: ${stats.failed_conversions}`,
      "",
      "Top conversions:",
      topFormats,
    ].join("\n"),
  );
}
