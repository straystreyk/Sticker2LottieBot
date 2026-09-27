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
      ? stats.topFormats
          .map(
            (item, index) => `${index + 1}. ${item.conversion}: ${item.total}`,
          )
          .join("\n")
      : "No conversions yet.";

  return ctx.reply(
    [
      "Bot stats",
      `Users: ${stats.total_users}`,
      `Active 7d: ${stats.active_users_7d}`,
      `Conversions: ${stats.total_conversions}`,
      `Success: ${stats.successful_conversions}`,
      `Failed: ${stats.failed_conversions}`,
      `Started: ${stats.started_users}`,
      `Sent a file: ${stats.users_with_file}`,
      `Activated: ${stats.activated_users}`,
      `Repeat users (2+): ${stats.repeat_users}`,
      `Referred users: ${stats.referred_users}`,
      `Auto-fix: ${stats.users_completed_autofix}/${stats.users_offered_autofix}`,
      `Added to managed pack: ${stats.users_added_to_pack}`,
      `Stars received: ${stats.stars_received} ⭐`,
      `Stars payments: ${stats.support_payments_count}`,
      `Supporters: ${stats.supporters_count}`,
      `Studio users: ${stats.studio_users}`,
      `Inline senders: ${stats.inline_senders}`,
      `Doctor users: ${stats.doctor_users}`,
      `Pack builder publishers: ${stats.pack_builder_publishers}`,
      "",
      "Top conversions:",
      topFormats,
    ].join("\n"),
  );
}
