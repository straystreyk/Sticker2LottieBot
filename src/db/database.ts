import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CONFIG } from "../config.js";

export type ConversionLogInput = {
  telegramUserId: number;
  sourceType: "tgs" | "json" | "lottie" | "svg" | "sticker_pack";
  targetType: "json" | "lottie" | "tgs" | "files";
  success: boolean;
  errorMessage?: string;
  outcome?:
    | "completed"
    | "completed_with_warnings"
    | "rejected_by_telegram"
    | "failed";
};

export type SupportPaymentInput = {
  telegramUserId: number;
  currency: "XTR";
  amount: number;
  invoicePayload: string;
  telegramPaymentChargeId: string;
  providerPaymentChargeId?: string;
};

export type ConversionResultInput = {
  telegramUserId: number;
  telegramFileId: string;
  telegramFileUniqueId?: string;
  outputKind: "sticker" | "document";
  fileName?: string;
  sourceType: string;
  targetType: string;
  emoji?: string;
};

export type StoredConversionResult = {
  id: number;
  telegram_user_id: number;
  telegram_file_id: string;
  telegram_file_unique_id: string | null;
  output_kind: "sticker" | "document";
  file_name: string | null;
  source_type: string;
  target_type: string;
  emoji: string;
  is_favorite: number;
  created_at: string;
};

export type StickerPackBuilderItem = {
  id: number;
  telegram_user_id: number;
  conversion_result_id: number;
  telegram_file_id: string;
  file_name: string | null;
  emoji: string;
  position: number;
  created_at: string;
};

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
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
  preferred_language: string | null;
  notifications_enabled: number;
  start_source: string | null;
  referrer_user_id: number | null;
  managed_sticker_set_name: string | null;
};

export type UserPreferences = {
  lastMode: string | null;
  defaultOutputFormat: "json" | "lottie" | null;
  preferredLanguage: "en" | "ru" | null;
  notificationsEnabled: boolean;
  managedStickerSetName: string | null;
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
    outcome TEXT NOT NULL DEFAULT 'completed',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_user_id) REFERENCES users (telegram_user_id)
  );

  CREATE TABLE IF NOT EXISTS product_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    properties_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_user_id) REFERENCES users (telegram_user_id)
  );

  CREATE INDEX IF NOT EXISTS product_events_user_created_idx
  ON product_events (telegram_user_id, created_at);

  CREATE INDEX IF NOT EXISTS product_events_name_created_idx
  ON product_events (event_name, created_at);

  CREATE TABLE IF NOT EXISTS support_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL,
    currency TEXT NOT NULL,
    amount INTEGER NOT NULL,
    invoice_payload TEXT NOT NULL,
    telegram_payment_charge_id TEXT NOT NULL UNIQUE,
    provider_payment_charge_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_user_id) REFERENCES users (telegram_user_id)
  );

  CREATE INDEX IF NOT EXISTS support_payments_user_created_idx
  ON support_payments (telegram_user_id, created_at);

  CREATE TABLE IF NOT EXISTS conversion_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL,
    telegram_file_id TEXT NOT NULL,
    telegram_file_unique_id TEXT,
    output_kind TEXT NOT NULL,
    file_name TEXT,
    source_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '✨',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_user_id) REFERENCES users (telegram_user_id)
  );

  CREATE INDEX IF NOT EXISTS conversion_results_user_created_idx
  ON conversion_results (telegram_user_id, created_at DESC, id DESC);

  CREATE TABLE IF NOT EXISTS sticker_pack_builder_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL,
    conversion_result_id INTEGER NOT NULL,
    telegram_file_id TEXT NOT NULL,
    file_name TEXT,
    emoji TEXT NOT NULL DEFAULT '✨',
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (telegram_user_id, conversion_result_id),
    FOREIGN KEY (telegram_user_id) REFERENCES users (telegram_user_id),
    FOREIGN KEY (conversion_result_id) REFERENCES conversion_results (id)
  );

  CREATE INDEX IF NOT EXISTS sticker_pack_builder_user_position_idx
  ON sticker_pack_builder_items (telegram_user_id, position, id);
`);

const ensureColumn = (table: string, column: string, definition: string) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

ensureColumn("users", "preferred_language", "TEXT");
ensureColumn("users", "notifications_enabled", "INTEGER NOT NULL DEFAULT 1");
ensureColumn("users", "start_source", "TEXT");
ensureColumn("users", "referrer_user_id", "INTEGER");
ensureColumn("users", "managed_sticker_set_name", "TEXT");
ensureColumn("conversion_logs", "outcome", "TEXT NOT NULL DEFAULT 'completed'");

const upsertUserStmt = db.prepare(`
  INSERT INTO users (telegram_user_id, username, first_name, last_name, preferred_language)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(telegram_user_id) DO UPDATE SET
    username = excluded.username,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    preferred_language = COALESCE(users.preferred_language, excluded.preferred_language),
    last_seen_at = CURRENT_TIMESTAMP
`);

const updateUserModeStmt = db.prepare(`
  UPDATE users
  SET last_mode = ?, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const updateUserDefaultOutputFormatStmt = db.prepare(`
  UPDATE users
  SET default_output_format = ?, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const updateUserLanguageStmt = db.prepare(`
  UPDATE users
  SET preferred_language = ?, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const updateNotificationsStmt = db.prepare(`
  UPDATE users
  SET notifications_enabled = ?, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const updateStartAttributionStmt = db.prepare(`
  UPDATE users
  SET start_source = COALESCE(start_source, ?),
      referrer_user_id = COALESCE(referrer_user_id, ?),
      last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const updateManagedStickerSetStmt = db.prepare(`
  UPDATE users
  SET managed_sticker_set_name = ?, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const incrementConversionCountStmt = db.prepare(`
  UPDATE users
  SET conversions_count = conversions_count + 1, last_seen_at = CURRENT_TIMESTAMP
  WHERE telegram_user_id = ?
`);

const insertConversionLogStmt = db.prepare(`
  INSERT INTO conversion_logs (telegram_user_id, source_type, target_type, success, outcome, error_message)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertProductEventStmt = db.prepare(`
  INSERT INTO product_events (telegram_user_id, event_name, properties_json)
  VALUES (?, ?, ?)
`);

const insertSupportPaymentStmt = db.prepare(`
  INSERT OR IGNORE INTO support_payments (
    telegram_user_id,
    currency,
    amount,
    invoice_payload,
    telegram_payment_charge_id,
    provider_payment_charge_id
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertConversionResultStmt = db.prepare(`
  INSERT INTO conversion_results (
    telegram_user_id,
    telegram_file_id,
    telegram_file_unique_id,
    output_kind,
    file_name,
    source_type,
    target_type,
    emoji
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const conversionResultsCountStmt = db.prepare(`
  SELECT COUNT(*) AS total
  FROM conversion_results
  WHERE telegram_user_id = ?
`);

const conversionResultsPageStmt = db.prepare(`
  SELECT *
  FROM conversion_results
  WHERE telegram_user_id = ?
  ORDER BY is_favorite DESC, created_at DESC, id DESC
  LIMIT ? OFFSET ?
`);

const conversionResultStmt = db.prepare(`
  SELECT *
  FROM conversion_results
  WHERE telegram_user_id = ? AND id = ?
`);

const inlineConversionResultsStmt = db.prepare(`
  SELECT *
  FROM conversion_results
  WHERE telegram_user_id = ?
    AND (
      ? = '' OR
      LOWER(COALESCE(file_name, '')) LIKE ? OR
      LOWER(source_type) LIKE ? OR
      LOWER(target_type) LIKE ?
    )
  ORDER BY is_favorite DESC, created_at DESC, id DESC
  LIMIT 20
`);

const toggleConversionResultFavoriteStmt = db.prepare(`
  UPDATE conversion_results
  SET is_favorite = CASE is_favorite WHEN 1 THEN 0 ELSE 1 END
  WHERE telegram_user_id = ? AND id = ?
`);

const addBuilderItemStmt = db.prepare(`
  INSERT OR IGNORE INTO sticker_pack_builder_items (
    telegram_user_id,
    conversion_result_id,
    telegram_file_id,
    file_name,
    emoji,
    position
  )
  SELECT
    telegram_user_id,
    id,
    telegram_file_id,
    file_name,
    emoji,
    COALESCE((
      SELECT MAX(position) + 1
      FROM sticker_pack_builder_items
      WHERE telegram_user_id = conversion_results.telegram_user_id
    ), 1)
  FROM conversion_results
  WHERE telegram_user_id = ? AND id = ? AND output_kind = 'sticker'
`);

const builderItemsStmt = db.prepare(`
  SELECT *
  FROM sticker_pack_builder_items
  WHERE telegram_user_id = ?
  ORDER BY position ASC, id ASC
`);

const builderItemStmt = db.prepare(`
  SELECT *
  FROM sticker_pack_builder_items
  WHERE telegram_user_id = ? AND id = ?
`);

const removeBuilderItemStmt = db.prepare(`
  DELETE FROM sticker_pack_builder_items
  WHERE telegram_user_id = ? AND id = ?
`);

const updateBuilderItemPositionStmt = db.prepare(`
  UPDATE sticker_pack_builder_items
  SET position = ?
  WHERE telegram_user_id = ? AND id = ?
`);

const updateBuilderItemEmojiStmt = db.prepare(`
  UPDATE sticker_pack_builder_items
  SET emoji = ?
  WHERE telegram_user_id = ? AND id = ?
`);

const clearBuilderStmt = db.prepare(`
  DELETE FROM sticker_pack_builder_items
  WHERE telegram_user_id = ?
`);

const userPreferencesStmt = db.prepare(`
  SELECT last_mode, default_output_format, preferred_language, notifications_enabled, managed_sticker_set_name
  FROM users
  WHERE telegram_user_id = ?
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

const funnelStatsStmt = db.prepare(`
  SELECT
    COUNT(DISTINCT CASE WHEN event_name = 'start' THEN telegram_user_id END) AS started_users,
    COUNT(DISTINCT CASE WHEN event_name = 'file_received' THEN telegram_user_id END) AS users_with_file,
    COUNT(DISTINCT CASE WHEN event_name IN ('conversion_completed', 'autofix_completed') THEN telegram_user_id END) AS activated_users,
    COUNT(DISTINCT CASE WHEN event_name = 'autofix_offered' THEN telegram_user_id END) AS users_offered_autofix,
    COUNT(DISTINCT CASE WHEN event_name = 'autofix_completed' THEN telegram_user_id END) AS users_completed_autofix,
    COUNT(DISTINCT CASE WHEN event_name = 'sticker_added_to_managed_pack' THEN telegram_user_id END) AS users_added_to_pack,
    COUNT(DISTINCT CASE WHEN event_name = 'studio_opened' THEN telegram_user_id END) AS studio_users,
    COUNT(DISTINCT CASE WHEN event_name = 'inline_result_sent' THEN telegram_user_id END) AS inline_senders,
    COUNT(DISTINCT CASE WHEN event_name IN ('sticker_doctor_completed', 'sticker_pack_doctor_completed') THEN telegram_user_id END) AS doctor_users,
    COUNT(DISTINCT CASE WHEN event_name = 'sticker_pack_builder_published' THEN telegram_user_id END) AS pack_builder_publishers
  FROM product_events
`);

const repeatAndReferralStatsStmt = db.prepare(`
  SELECT
    COUNT(CASE WHEN conversions_count >= 2 THEN 1 END) AS repeat_users,
    COUNT(CASE WHEN referrer_user_id IS NOT NULL THEN 1 END) AS referred_users
  FROM users
`);

const supportStatsStmt = db.prepare(`
  SELECT
    COALESCE(SUM(amount), 0) AS stars_received,
    COUNT(*) AS support_payments_count,
    COUNT(DISTINCT telegram_user_id) AS supporters_count
  FROM support_payments
  WHERE currency = 'XTR'
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
    conversions_count,
    preferred_language,
    notifications_enabled,
    start_source,
    referrer_user_id,
    managed_sticker_set_name
  FROM users
  ORDER BY last_seen_at DESC, telegram_user_id DESC
  LIMIT ? OFFSET ?
`);

const allUserIdsStmt = db.prepare(`
  SELECT telegram_user_id
  FROM users
  WHERE notifications_enabled = 1
  ORDER BY telegram_user_id ASC
`);

export function upsertTelegramUser(user: TelegramUser) {
  const detectedLanguage = user.language_code?.toLowerCase().startsWith("ru")
    ? "ru"
    : "en";
  upsertUserStmt.run(
    user.id,
    user.username ?? null,
    user.first_name ?? null,
    user.last_name ?? null,
    detectedLanguage,
  );
}

export function setUserMode(telegramUserId: number, mode: string) {
  updateUserModeStmt.run(mode, telegramUserId);
}

export function setUserDefaultOutputFormat(
  telegramUserId: number,
  format: "json" | "lottie",
) {
  updateUserDefaultOutputFormatStmt.run(format, telegramUserId);
}

export function setUserLanguage(telegramUserId: number, language: "en" | "ru") {
  updateUserLanguageStmt.run(language, telegramUserId);
}

export function setUserNotifications(telegramUserId: number, enabled: boolean) {
  updateNotificationsStmt.run(enabled ? 1 : 0, telegramUserId);
}

export function setUserStartAttribution(
  telegramUserId: number,
  source: string | null,
  referrerUserId: number | null,
) {
  updateStartAttributionStmt.run(source, referrerUserId, telegramUserId);
}

export function setManagedStickerSetName(
  telegramUserId: number,
  stickerSetName: string,
) {
  updateManagedStickerSetStmt.run(stickerSetName, telegramUserId);
}

export function getUserPreferences(telegramUserId: number): UserPreferences {
  const row = userPreferencesStmt.get(telegramUserId) as
    | {
        last_mode: string | null;
        default_output_format: string | null;
        preferred_language: string | null;
        notifications_enabled: number;
        managed_sticker_set_name: string | null;
      }
    | undefined;

  return {
    lastMode: row?.last_mode ?? null,
    defaultOutputFormat:
      row?.default_output_format === "json" ||
      row?.default_output_format === "lottie"
        ? row.default_output_format
        : null,
    preferredLanguage:
      row?.preferred_language === "ru" || row?.preferred_language === "en"
        ? row.preferred_language
        : null,
    notificationsEnabled: row?.notifications_enabled !== 0,
    managedStickerSetName: row?.managed_sticker_set_name ?? null,
  };
}

export function logProductEvent(
  telegramUserId: number,
  eventName: string,
  properties?: Record<string, unknown>,
) {
  insertProductEventStmt.run(
    telegramUserId,
    eventName,
    properties ? JSON.stringify(properties) : null,
  );
}

export function recordSupportPayment(input: SupportPaymentInput) {
  const result = insertSupportPaymentStmt.run(
    input.telegramUserId,
    input.currency,
    input.amount,
    input.invoicePayload,
    input.telegramPaymentChargeId,
    input.providerPaymentChargeId ?? null,
  );

  return Number(result.changes) > 0;
}

export function recordConversionResult(input: ConversionResultInput) {
  const result = insertConversionResultStmt.run(
    input.telegramUserId,
    input.telegramFileId,
    input.telegramFileUniqueId ?? null,
    input.outputKind,
    input.fileName ?? null,
    input.sourceType,
    input.targetType,
    input.emoji ?? "✨",
  );
  return Number(result.lastInsertRowid);
}

export function getConversionResultsPage(
  telegramUserId: number,
  page: number,
  pageSize = 6,
) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Math.min(20, Math.max(1, pageSize));
  const total = (
    conversionResultsCountStmt.get(telegramUserId) as { total: number }
  ).total;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const normalizedPage = Math.min(safePage, totalPages);
  const items = conversionResultsPageStmt.all(
    telegramUserId,
    safePageSize,
    (normalizedPage - 1) * safePageSize,
  ) as StoredConversionResult[];
  return { items, total, page: normalizedPage, totalPages };
}

export function getConversionResult(telegramUserId: number, resultId: number) {
  return conversionResultStmt.get(telegramUserId, resultId) as
    | StoredConversionResult
    | undefined;
}

export function getInlineConversionResults(
  telegramUserId: number,
  rawQuery: string,
) {
  const query = rawQuery.trim().toLowerCase().slice(0, 64);
  const pattern = `%${query}%`;
  return inlineConversionResultsStmt.all(
    telegramUserId,
    query,
    pattern,
    pattern,
    pattern,
  ) as StoredConversionResult[];
}

export function toggleConversionResultFavorite(
  telegramUserId: number,
  resultId: number,
) {
  toggleConversionResultFavoriteStmt.run(telegramUserId, resultId);
  return getConversionResult(telegramUserId, resultId);
}

export function addResultToStickerPackBuilder(
  telegramUserId: number,
  resultId: number,
) {
  const result = addBuilderItemStmt.run(telegramUserId, resultId);
  return Number(result.changes) > 0;
}

export function getStickerPackBuilderItems(telegramUserId: number) {
  return builderItemsStmt.all(telegramUserId) as StickerPackBuilderItem[];
}

export function removeStickerPackBuilderItem(
  telegramUserId: number,
  itemId: number,
) {
  removeBuilderItemStmt.run(telegramUserId, itemId);
}

export function moveStickerPackBuilderItem(
  telegramUserId: number,
  itemId: number,
  direction: "up" | "down",
) {
  const items = getStickerPackBuilderItems(telegramUserId);
  const index = items.findIndex((item) => item.id === itemId);
  const otherIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || otherIndex < 0 || otherIndex >= items.length) return false;

  const item = items[index];
  const other = items[otherIndex];
  updateBuilderItemPositionStmt.run(other.position, telegramUserId, item.id);
  updateBuilderItemPositionStmt.run(item.position, telegramUserId, other.id);
  return true;
}

export function updateStickerPackBuilderEmoji(
  telegramUserId: number,
  itemId: number,
  emoji: string,
) {
  const item = builderItemStmt.get(telegramUserId, itemId) as
    | StickerPackBuilderItem
    | undefined;
  if (!item) return false;
  updateBuilderItemEmojiStmt.run(emoji, telegramUserId, itemId);
  return true;
}

export function clearStickerPackBuilder(telegramUserId: number) {
  clearBuilderStmt.run(telegramUserId);
}

export function logConversion(input: ConversionLogInput) {
  insertConversionLogStmt.run(
    input.telegramUserId,
    input.sourceType,
    input.targetType,
    input.success ? 1 : 0,
    input.outcome ?? (input.success ? "completed" : "failed"),
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

  const topFormats = topFormatsStmt.all() as Array<{
    conversion: string;
    total: number;
  }>;
  const funnel = funnelStatsStmt.get() as {
    started_users: number;
    users_with_file: number;
    activated_users: number;
    users_offered_autofix: number;
    users_completed_autofix: number;
    users_added_to_pack: number;
    studio_users: number;
    inline_senders: number;
    doctor_users: number;
    pack_builder_publishers: number;
  };
  const growth = repeatAndReferralStatsStmt.get() as {
    repeat_users: number;
    referred_users: number;
  };
  const support = supportStatsStmt.get() as {
    stars_received: number;
    support_payments_count: number;
    supporters_count: number;
  };

  return {
    ...totals,
    ...funnel,
    ...growth,
    ...support,
    topFormats,
  };
}

export function getUsersPage(page: number, pageSize: number) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
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
  return (allUserIdsStmt.all() as Array<{ telegram_user_id: number }>).map(
    (row) => row.telegram_user_id,
  );
}
