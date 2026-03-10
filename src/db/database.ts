import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CONFIG } from "../config.js";

export type ConversionLogInput = {
  telegramUserId: number;
  sourceType: "tgs" | "json" | "lottie" | "sticker_pack";
  targetType: "json" | "lottie" | "tgs" | "files";
  success: boolean;
  errorMessage?: string;
};

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type StoredUser = {
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_mode: string | null;
  default_output_format: string | null;
  conversions_count: number;
};

mkdirSync(dirname(CONFIG.dbPath), { recursive: true });

const db = new DatabaseSync(CONFIG.dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_mode TEXT,
    default_output_format TEXT,
    conversions_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS conversion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    success INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_user_id) REFERENCES users (telegram_user_id)
  );
`);

const upsertUserStmt = db.prepare(`
  INSERT INTO users (telegram_user_id, username, first_name, last_name)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(telegram_user_id) DO UPDATE SET
    username = excluded.username,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    last_seen_at = CURRENT_TIMESTAMP
`);

const updateUserModeStmt = db.prepare(`
  UPDATE users
  SET last_mode = ?, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const incrementConversionCountStmt = db.prepare(`
  UPDATE users
  SET conversions_count = conversions_count + 1, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const insertConversionLogStmt = db.prepare(`
  INSERT INTO conversion_logs (telegram_user_id, source_type, target_type, success, error_message)
  VALUES (?, ?, ?, ?, ?)
`);

const statsStmt = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM conversion_logs) AS total_conversions,
    (SELECT COUNT(*) FROM conversion_logs WHERE success = 1) AS successful_conversions,
    (SELECT COUNT(*) FROM conversion_logs WHERE success = 0) AS failed_conversions,
    (SELECT COUNT(*) FROM users WHERE last_seen_at >= datetime('now', '-7 days')) AS active_users_7d
`);

const topFormatsStmt = db.prepare(`
  SELECT source_type || ' -> ' || target_type AS conversion, COUNT(*) AS total
  FROM conversion_logs
  GROUP BY source_type, target_type
  ORDER BY total DESC
  LIMIT 5
`);

const usersCountStmt = db.prepare(`
  SELECT COUNT(*) AS total FROM users
`);

const usersPageStmt = db.prepare(`
  SELECT
    telegram_user_id,
    username,
    first_name,
    last_name,
    first_seen_at,
    last_seen_at,
    last_mode,
    default_output_format,
    conversions_count
  FROM users
  ORDER BY last_seen_at DESC, telegram_user_id DESC
  LIMIT ? OFFSET ?
`);

const allUserIdsStmt = db.prepare(`
  SELECT telegram_user_id
  FROM users
  ORDER BY telegram_user_id ASC
`);

export function upsertTelegramUser(user: TelegramUser) {
  upsertUserStmt.run(user.id, user.username ?? null, user.first_name ?? null, user.last_name ?? null);
}

export function setUserMode(telegramUserId: number, mode: string) {
  updateUserModeStmt.run(mode, telegramUserId);
}

export function logConversion(input: ConversionLogInput) {
  insertConversionLogStmt.run(
    input.telegramUserId,
    input.sourceType,
    input.targetType,
    input.success ? 1 : 0,
    input.errorMessage ?? null,
  );

  if (input.success) {
    incrementConversionCountStmt.run(input.telegramUserId);
  }
}

export function getAdminStats() {
  const totals = statsStmt.get() as {
    total_users: number;
    total_conversions: number;
    successful_conversions: number;
    failed_conversions: number;
    active_users_7d: number;
  };

  const topFormats = topFormatsStmt.all() as Array<{ conversion: string; total: number }>;

  return {
    ...totals,
    topFormats,
  };
}

export function getUsersPage(page: number, pageSize: number) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  const total = (usersCountStmt.get() as { total: number }).total;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const normalizedPage = Math.min(safePage, totalPages);
  const offset = (normalizedPage - 1) * safePageSize;
  const users = usersPageStmt.all(safePageSize, offset) as StoredUser[];

  return {
    users,
    total,
    page: normalizedPage,
    pageSize: safePageSize,
    totalPages,
  };
}

export function getAllTelegramUserIds() {
  return (allUserIdsStmt.all() as Array<{ telegram_user_id: number }>).map((row) => row.telegram_user_id);
}
