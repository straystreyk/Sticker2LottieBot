import { InlineKeyboard, type Context } from "grammy";
import { isAdmin } from "../admin.js";
import { getUsersPage, type StoredUser } from "../db/database.js";

const PAGE_SIZE = 20;

function formatUserLabel(user: StoredUser) {
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const username = user.username ? `@${user.username}` : "no username";
  const mode = user.last_mode ?? "n/a";

  return [
    `#${user.telegram_user_id}`,
    displayName || username,
    displayName ? username : null,
    `conversions: ${user.conversions_count}`,
    `last mode: ${mode}`,
    `last seen: ${user.last_seen_at}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

function buildUsersKeyboard(page: number, totalPages: number) {
  const keyboard = new InlineKeyboard();

  if (page > 1) {
    keyboard.text("Prev", `users:${page - 1}`);
  }

  if (page < totalPages) {
    keyboard.text("Next", `users:${page + 1}`);
  }

  return keyboard;
}

export function buildUsersPageText(page: number) {
  const result = getUsersPage(page, PAGE_SIZE);
  const lines = [
    `Users page ${result.page}/${result.totalPages}`,
    `Total users: ${result.total}`,
    "",
  ];

  if (result.users.length === 0) {
    lines.push("No users yet.");
  } else {
    result.users.forEach((user, index) => {
      lines.push(`${(result.page - 1) * result.pageSize + index + 1}. ${formatUserLabel(user)}`);
    });
  }

  return {
    text: lines.join("\n"),
    keyboard: buildUsersKeyboard(result.page, result.totalPages),
  };
}

export async function usersCommand(ctx: Context) {
  const userId = ctx.from?.id;
  if (!isAdmin(userId)) {
    return ctx.reply("This command is available only for bot admins.");
  }

  const commandText = ctx.message?.text ?? "";
  const [, pageArg] = commandText.trim().split(/\s+/, 2);
  const page = Number(pageArg ?? 1);
  const { text, keyboard } = buildUsersPageText(page);

  return ctx.reply(text, { reply_markup: keyboard });
}
