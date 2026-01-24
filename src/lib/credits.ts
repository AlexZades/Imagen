import { prisma } from '@/lib/prisma';

export const CREDITS_CONFIG_KEYS = {
  creditCost: 'credits_credit_cost',
  dailyFreeCredits: 'credits_daily_free_credits',
  maxFreeCreditLimit: 'credits_max_free_credit_limit',
} as const;

export type CreditsConfig = {
  creditCost: number;
  dailyFreeCredits: number;
  maxFreeCreditLimit: number;
};

export const DEFAULT_CREDITS_CONFIG: CreditsConfig = {
  creditCost: 1,
  dailyFreeCredits: 10,
  maxFreeCreditLimit: 50,
};

export function isCreditsSystemEnabled(): boolean {
  return process.env.CREDITS_SYSTEM_ENABLED === 'true';
}

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export async function getCreditsConfig(): Promise<CreditsConfig> {
  const configs = await prisma.generationConfig.findMany({
    where: {
      key: {
        in: [
          CREDITS_CONFIG_KEYS.creditCost,
          CREDITS_CONFIG_KEYS.dailyFreeCredits,
          CREDITS_CONFIG_KEYS.maxFreeCreditLimit,
        ],
      },
    },
    select: { key: true, value: true },
  });

  const map = new Map(configs.map((c) => [c.key, c.value]));

  return {
    creditCost: parsePositiveInt(map.get(CREDITS_CONFIG_KEYS.creditCost), DEFAULT_CREDITS_CONFIG.creditCost),
    dailyFreeCredits: parsePositiveInt(
      map.get(CREDITS_CONFIG_KEYS.dailyFreeCredits),
      DEFAULT_CREDITS_CONFIG.dailyFreeCredits
    ),
    maxFreeCreditLimit: parsePositiveInt(
      map.get(CREDITS_CONFIG_KEYS.maxFreeCreditLimit),
      DEFAULT_CREDITS_CONFIG.maxFreeCreditLimit
    ),
  };
}

function isoDay(date: Date): string {
  // UTC day boundary
  return date.toISOString().slice(0, 10);
}

type UserCreditsRow = {
  creditsFree: number;
  creditsFreeLastGrantAt: Date | null;
};

async function getUserCreditsRow(userId: string): Promise<UserCreditsRow | null> {
  const rows = await prisma.$queryRaw<UserCreditsRow[]>`
    SELECT
      "credits_free" as "creditsFree",
      "credits_free_last_grant_at" as "creditsFreeLastGrantAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getUserCreditsFree(userId: string): Promise<number | null> {
  const row = await getUserCreditsRow(userId);
  return row ? row.creditsFree : null;
}

export async function grantDailyFreeCreditsIfNeeded(userId: string): Promise<{ creditsFree: number } | null> {
  if (!isCreditsSystemEnabled()) return null;

  const [row, config] = await Promise.all([getUserCreditsRow(userId), getCreditsConfig()]);
  if (!row) return null;

  const today = isoDay(new Date());
  const last = row.creditsFreeLastGrantAt ? isoDay(row.creditsFreeLastGrantAt) : null;

  if (last === today) {
    return { creditsFree: row.creditsFree };
  }

  const newCredits = Math.min(config.maxFreeCreditLimit, row.creditsFree + config.dailyFreeCredits);
  const now = new Date();

  const updated = await prisma.$queryRaw<Array<{ creditsFree: number }>>`
    UPDATE "User"
    SET "credits_free" = ${newCredits},
        "credits_free_last_grant_at" = ${now}
    WHERE "id" = ${userId}
    RETURNING "credits_free" as "creditsFree"
  `;

  return { creditsFree: updated[0]?.creditsFree ?? newCredits };
}

export async function tryConsumeFreeCredits(params: {
  userId: string;
  cost: number;
}): Promise<{ ok: true; creditsFree: number } | { ok: false; reason: 'insufficient_credits' | 'user_not_found' }> {
  if (params.cost <= 0) {
    const credits = await getUserCreditsFree(params.userId);
    if (credits === null) return { ok: false, reason: 'user_not_found' };
    return { ok: true, creditsFree: credits };
  }

  const updated = await prisma.$queryRaw<Array<{ creditsFree: number }>>`
    UPDATE "User"
    SET "credits_free" = "credits_free" - ${params.cost}
    WHERE "id" = ${params.userId}
      AND "credits_free" >= ${params.cost}
    RETURNING "credits_free" as "creditsFree"
  `;

  if (!updated[0]) {
    const exists = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${params.userId} LIMIT 1
    `;

    if (!exists[0]) return { ok: false, reason: 'user_not_found' };
    return { ok: false, reason: 'insufficient_credits' };
  }

  return { ok: true, creditsFree: updated[0].creditsFree };
}

export async function refundFreeCredits(params: { userId: string; amount: number }): Promise<void> {
  if (params.amount <= 0) return;
  await prisma.$executeRaw`
    UPDATE "User"
    SET "credits_free" = "credits_free" + ${params.amount}
    WHERE "id" = ${params.userId}
  `;
}