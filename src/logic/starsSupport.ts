export const STAR_SUPPORT_AMOUNTS = [50, 100, 250] as const;

export type StarSupportAmount = (typeof STAR_SUPPORT_AMOUNTS)[number];

export type StarSupportPayload = {
  telegramUserId: number;
  amount: StarSupportAmount;
};

export function isStarSupportAmount(value: number): value is StarSupportAmount {
  return STAR_SUPPORT_AMOUNTS.includes(value as StarSupportAmount);
}

export function createStarSupportPayload(
  telegramUserId: number,
  amount: StarSupportAmount,
) {
  return `support:stars:${telegramUserId}:${amount}:${Date.now()}`;
}

export function parseStarSupportPayload(
  payload: string,
): StarSupportPayload | null {
  const match = /^support:stars:(\d+):(\d+):(\d+)$/.exec(payload);
  if (!match) return null;

  const telegramUserId = Number(match[1]);
  const amount = Number(match[2]);
  if (
    !Number.isSafeInteger(telegramUserId) ||
    telegramUserId <= 0 ||
    !isStarSupportAmount(amount)
  ) {
    return null;
  }

  return { telegramUserId, amount };
}
