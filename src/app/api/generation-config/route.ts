import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CREDITS_CONFIG_KEYS, DEFAULT_CREDITS_CONFIG } from '@/lib/credits';

const DEFAULT_FALLBACK_TAGS = [
  'standing', 'sitting', 'smiling', 'looking at viewer',
  'outdoors', 'indoors', 'day', 'night',
  'solo', 'portrait', 'full body', 'upper body',
  'detailed', 'high quality', 'masterpiece',
];

const DEFAULT_SPEECH_BUBBLE_TRIGGERS = [
  'speech bubble', 'speech_bubble', 'speech-bubble', 
  'dialogue', 'text', 'comic', 'manga'
];

interface GenerationConfig {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

function defaultForKey(key: string): string | null {
  if (key === 'fallback_tags') return DEFAULT_FALLBACK_TAGS.join(', ');
  if (key === 'speech_bubble_triggers') return DEFAULT_SPEECH_BUBBLE_TRIGGERS.join(', ');

  if (key === CREDITS_CONFIG_KEYS.creditCost) return String(DEFAULT_CREDITS_CONFIG.creditCost);
  if (key === CREDITS_CONFIG_KEYS.dailyFreeCredits) return String(DEFAULT_CREDITS_CONFIG.dailyFreeCredits);
  if (key === CREDITS_CONFIG_KEYS.maxFreeCreditLimit) return String(DEFAULT_CREDITS_CONFIG.maxFreeCreditLimit);

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (key) {
      // Get specific config
      const config = await prisma.generationConfig.findUnique({
        where: { key }
      });

      if (!config) {
        const def = defaultForKey(key);
        if (def !== null) {
          return NextResponse.json({
            key,
            value: def,
          });
        }

        return NextResponse.json({ message: 'Config not found' }, { status: 404 });
      }

      return NextResponse.json(config);
    } else {
      // Get all configs
      const configs = await prisma.generationConfig.findMany();

      // Ensure fallback_tags exists
      let fallbackTags = configs.find((c: GenerationConfig) => c.key === 'fallback_tags');
      if (!fallbackTags) {
        fallbackTags = {
          id: 'default',
          key: 'fallback_tags',
          value: DEFAULT_FALLBACK_TAGS.join(', '),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Ensure speech_bubble_triggers exists
      let bubbleTriggers = configs.find((c: GenerationConfig) => c.key === 'speech_bubble_triggers');
      if (!bubbleTriggers) {
        bubbleTriggers = {
          id: 'default-bubbles',
          key: 'speech_bubble_triggers',
          value: DEFAULT_SPEECH_BUBBLE_TRIGGERS.join(', '),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Ensure credits settings exist (as virtual defaults)
      const creditCost =
        configs.find((c: GenerationConfig) => c.key === CREDITS_CONFIG_KEYS.creditCost) ||
        ({
          id: 'default-credits-cost',
          key: CREDITS_CONFIG_KEYS.creditCost,
          value: String(DEFAULT_CREDITS_CONFIG.creditCost),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GenerationConfig);

      const dailyFreeCredits =
        configs.find((c: GenerationConfig) => c.key === CREDITS_CONFIG_KEYS.dailyFreeCredits) ||
        ({
          id: 'default-daily-free-credits',
          key: CREDITS_CONFIG_KEYS.dailyFreeCredits,
          value: String(DEFAULT_CREDITS_CONFIG.dailyFreeCredits),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GenerationConfig);

      const maxFreeCreditLimit =
        configs.find((c: GenerationConfig) => c.key === CREDITS_CONFIG_KEYS.maxFreeCreditLimit) ||
        ({
          id: 'default-max-free-credit-limit',
          key: CREDITS_CONFIG_KEYS.maxFreeCreditLimit,
          value: String(DEFAULT_CREDITS_CONFIG.maxFreeCreditLimit),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GenerationConfig);

      return NextResponse.json({
        configs: [
          ...configs,
          fallbackTags,
          bubbleTriggers,
          creditCost,
          dailyFreeCredits,
          maxFreeCreditLimit,
        ],
      });
    }
  } catch (error: any) {
    console.error('Error fetching generation config:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, key, value } = await request.json();

    if (!userId || !key || !value) {
      return NextResponse.json(
        { message: 'userId, key, and value are required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Upsert the config
    const config = await prisma.generationConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error saving generation config:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}