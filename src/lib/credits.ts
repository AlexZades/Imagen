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

export async function grantDailyFreeCreditsIfNeeded(userId: string): Promise<{ creditsFree: number } | null> {
  if (!isCreditsSystemEnabled()) return null;

  const [user, config] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        creditsFree: true,
        creditsFreeLastGrantAt: true,
      },
    }),
    getCreditsConfig(),
  ]);

  if (!user) return null;

  const today = isoDay(new Date());
  const last = user.creditsFreeLastGrantAt ? isoDay(user.creditsFreeLastGrantAt) : null;

  if (last === today) {
    return { creditsFree: user.creditsFree };
  }

  const newCredits = Math.min(config.maxFreeCreditLimit, user.creditsFree + config.dailyFreeCredits);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      creditsFree: newCredits,
      creditsFreeLastGrantAt: new Date(),
    },
    select: { creditsFree: true },
  });

  return { creditsFree: updated.creditsFree };
}

export async function tryConsumeFreeCredits(params: {
  userId: string;
  cost: number;
}): Promise<{ ok: true; creditsFree: number } | { ok: false; reason: 'insufficient_credits' | 'user_not_found' }> {
  if (params.cost <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { creditsFree: true },
    });

    if (!user) return { ok: false, reason: 'user_not_found' };
    return { ok: true, creditsFree: user.creditsFree };
  }

  const result = await prisma.user.updateMany({
    where: {
      id: params.userId,
      creditsFree: { gte: params.cost },
    },
    data: {
      creditsFree: { decrement: params.cost },
    },
  });

  if (result.count === 0) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });

    if (!user) return { ok: false, reason: 'user_not_found' };
    return { ok: false, reason: 'insufficient_credits' };
  }

  const updated = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { creditsFree: true },
  });

  return { ok: true, creditsFree: updated?.creditsFree ?? 0 };
}

export async function refundFreeCredits(params: { userId: string; amount: number }): Promise<void> {
  if (params.amount <= 0) return;
  await prisma.user.update({
    where: { id: params.userId },
    data: { creditsFree: { increment: params.amount } },
  });
}
