import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt_tags, model_name, lora_names, lora_weights } = await request.json();

    if (!prompt_tags || !model_name) {
      return NextResponse.json(
        { message: 'prompt_tags and model_name are required' },
        { status: 400 }
      );
    }

    const comfyuiUrl = process.env.COMFYUI_API_URL;
    if (!comfyuiUrl) {
      return NextResponse.json(
        { message: 'COMFYUI_API_URL environment variable not set' },
        { status: 500 }
      );
    }

    const fullUrl = `${comfyuiUrl}/generate`;
    
    // Build the request body
    const requestBody: any = {
      prompt_tags,
      model_name,
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
        requestBody.lora_weight = weightsToUse.map(w => String(w)).join(',');
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
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return NextResponse.json({ 
      image: base64Image,
      contentType: response.headers.get('content-type') || 'image/png'
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { message: 'Generation failed', error: error.message },
      { status: 500 }
    );
  }
}