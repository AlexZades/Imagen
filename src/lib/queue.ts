import { prisma } from '@/lib/prisma';
import { refundFreeCredits } from '@/lib/credits';

const globalForQueue = globalThis as unknown as {
  queueProcessor: QueueProcessor | undefined;
};

export class QueueProcessor {
  private static instance: QueueProcessor;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 2000;
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): QueueProcessor {
    if (!globalForQueue.queueProcessor) {
      globalForQueue.queueProcessor = new QueueProcessor();
    }
    return globalForQueue.queueProcessor;
  }

  public start() {
    if (this.intervalId) return;
    console.log('Starting QueueProcessor...');
    // Initial check
    this.processNext();
    // Loop
    this.intervalId = setInterval(() => this.processNext(), this.INTERVAL_MS);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find oldest pending request
      const request = await prisma.generationRequest.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
      });

      if (!request) {
        this.isProcessing = false;
        return;
      }

      console.log(`Processing generation request ${request.id}`);

      // Mark as processing
      await prisma.generationRequest.update({
        where: { id: request.id },
        data: { status: 'processing' }
      });

      const params = JSON.parse(request.params);

      try {
        const result = await this.generateImage(params);
        
        await prisma.generationRequest.update({
          where: { id: request.id },
          data: { 
            status: 'completed',
            result: JSON.stringify(result)
          }
        });
      } catch (error: any) {
        console.error(`Generation failed for request ${request.id}:`, error);
        
        // Refund credits if needed
        if (params.userId && params.creditCost > 0 && !params.isUnlimited) {
             await refundFreeCredits({ userId: params.userId, amount: params.creditCost });
        }

        await prisma.generationRequest.update({
          where: { id: request.id },
          data: { 
            status: 'failed',
            error: error.message || 'Unknown error'
          }
        });
      }

    } catch (e) {
      console.error('Queue processing error:', e);
    } finally {
      this.isProcessing = false;
    }
  }

  private async generateImage(params: any): Promise<any> {
    const { prompt_tags, model_name, lora_names, lora_weights, aspect, seed, cfg } = params;

    const comfyuiUrl = process.env.COMFYUI_API_URL;
    if (!comfyuiUrl) {
      throw new Error('COMFYUI_API_URL environment variable not set');
    }

    const fullUrl = `${comfyuiUrl}/generate`;
    
    // Build the request body
    const requestBody: any = {
      prompt_tags,
      model_name,
      aspect: aspect || 1,
      seed: parseInt(String(seed)),
      cfg_scale: String(cfg || 6.0),
    };

    // Handle multiple LoRAs (up to 4)
    if (lora_names && Array.isArray(lora_names) && lora_names.length > 0) {
      const lorasToUse = lora_names.slice(0, 4);
      requestBody.lora_name = lorasToUse.join(',');
      
      if (lora_weights && Array.isArray(lora_weights)) {
        const weightsToUse = lora_weights.slice(0, lorasToUse.length);
        requestBody.lora_weight = weightsToUse.map((w: any) => String(w)).join(',');
      } else if (lora_weights) {
        requestBody.lora_weight = Array(lorasToUse.length).fill(String(lora_weights)).join(',');
      } else {
        requestBody.lora_weight = Array(lorasToUse.length).fill('1').join(',');
      }
    }

    console.log('ComfyUI Request:', {
      url: fullUrl,
      body: requestBody,
    });

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/octet-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return { 
      image: base64Image,
      contentType: response.headers.get('content-type') || 'image/png',
    };
  }
}