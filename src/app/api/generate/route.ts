import { NextRequest, NextResponse } from 'next/server';
import { getCreditsConfig, isCreditsSystemEnabled, refundFreeCredits, tryConsumeFreeCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import { QueueProcessor } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const { prompt_tags, model_name, lora_names, lora_weights, aspect, userId, consumeCredits, seed, cfg } =
      await request.json();

    if (!prompt_tags || !model_name) {
      return NextResponse.json(
        { message: 'prompt_tags and model_name are required' },
        { status: 400 }
      );
    }

    const creditsEnabled = isCreditsSystemEnabled();
    const consumptionRequested = creditsEnabled && consumeCredits !== false;

    let creditCost = 0;
    let creditsFreeAfter: number | undefined;
    let isUnlimited = false;

    if (consumptionRequested) {
      if (!userId) {
        return NextResponse.json(
          { message: 'userId is required when credits system is enabled' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true },
      });

      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      if (user.isAdmin) {
        isUnlimited = true;
      } else {
        const config = await getCreditsConfig();
        creditCost = config.creditCost;

        const consumeResult = await tryConsumeFreeCredits({ userId, cost: creditCost });

        if (!consumeResult.ok) {
          return NextResponse.json(
            {
              message:
                consumeResult.reason === 'insufficient_credits'
                  ? 'Insufficient credits'
                  : 'User not found',
              reason: consumeResult.reason,
            },
            { status: consumeResult.reason === 'insufficient_credits' ? 402 : 404 }
          );
        }

        creditsFreeAfter = consumeResult.creditsFree;
      }
    }

    // Determine seed
    let finalSeed = seed;
    if (finalSeed === undefined || finalSeed === null) {
      try {
        const configRecord = await prisma.generationConfig.findUnique({
          where: { key: 'algorithm_settings' }
        });
        
        if (configRecord && configRecord.value) {
          const settings = JSON.parse(configRecord.value);
          if (settings.defaultSeed !== undefined) {
            finalSeed = settings.defaultSeed;
          }
        }
      } catch (e) {
        console.error("Error fetching default seed:", e);
      }
      
      // Fallback
      if (finalSeed === undefined) {
        finalSeed = 1234567890;
      }
    }

    // Create Generation Request
    const params = {
      prompt_tags,
      model_name,
      lora_names,
      lora_weights,
      aspect,
      seed: finalSeed,
      cfg,
      userId,
      creditCost,
      isUnlimited,
      creditsFreeAfter // Store this to return to client later if needed
    };

    const generationRequest = await prisma.generationRequest.create({
      data: {
        userId,
        params: JSON.stringify(params),
        status: 'pending'
      }
    });

    // Start Queue Processor if not running
    QueueProcessor.getInstance().start();

    return NextResponse.json({ 
      requestId: generationRequest.id,
      status: 'pending',
      credits: creditsEnabled
        ? {
            isUnlimited,
            cost: creditCost,
            remainingFree: creditsFreeAfter,
          }
        : undefined,
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { message: 'Generation failed', error: error.message },
      { status: 500 }
    );
  }
}