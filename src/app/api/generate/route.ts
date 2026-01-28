import { NextRequest, NextResponse } from 'next/server';
import { getCreditsConfig, isCreditsSystemEnabled, refundFreeCredits, tryConsumeFreeCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

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

    // If credits are enabled and the caller didn't explicitly disable consumption,
    // enforce credits EXCEPT for admin users (admins are unlimited).
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
        // Admin users do not consume credits.
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

    const comfyuiUrl = process.env.COMFYUI_API_URL;
    if (!comfyuiUrl) {
      // Refund if we consumed credits but can't complete the request
      if (creditsEnabled && consumptionRequested && userId && creditCost > 0 && !isUnlimited) {
        await refundFreeCredits({ userId, amount: creditCost });
      }

      return NextResponse.json(
        { message: 'COMFYUI_API_URL environment variable not set' },
        { status: 500 }
      );
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

    const fullUrl = `${comfyuiUrl}/generate`;
    
    // Build the request body
    const requestBody: any = {
      prompt_tags,
      model_name,
      aspect: aspect || 1, // Default to square if not provided
      seed: parseInt(String(finalSeed)),
      cfg_scale: String(cfg || 6.0),
    };

    // Handle multiple LoRAs (up to 4)
    if (lora_names && Array.isArray(lora_names) && lora_names.length > 0) {
      // Take up to 4 LoRAs
      const lorasToUse = lora_names.slice(0, 4);
      
      // Convert array to comma-delimited string
      requestBody.lora_name = lorasToUse.join(',');
      
      // Handle weights - if provided as array, convert to comma-delimited string
      if (lora_weights && Array.isArray(lora_weights)) {
        const weightsToUse = lora_weights.slice(0, lorasToUse.length);
        requestBody.lora_weight = weightsToUse.map((w) => String(w)).join(',');
      } else if (lora_weights) {
        // If single weight provided, use it for all LoRAs
        requestBody.lora_weight = Array(lorasToUse.length).fill(String(lora_weights)).join(',');
      } else {
        // Default weight of 1 for all LoRAs
        requestBody.lora_weight = Array(lorasToUse.length).fill('1').join(',');
      }
    }

    console.log('ComfyUI Request:', {
      url: fullUrl,
      body: requestBody,
    });

    // Call the ComfyUI API
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/octet-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('ComfyUI Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ComfyUI Error Response:', errorText);

      // Refund if generation failed
      if (creditsEnabled && consumptionRequested && userId && creditCost > 0 && !isUnlimited) {
        await refundFreeCredits({ userId, amount: creditCost });
      }

      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return NextResponse.json({ 
      image: base64Image,
      contentType: response.headers.get('content-type') || 'image/png',
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