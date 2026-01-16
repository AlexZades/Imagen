import { prisma } from '@/lib/prisma';

// ==================== Types ====================

export interface GenerationConfig {
  // Global settings
  imagesPerUser: number;
  closeRecommendationsCount: number;
  mixedRecommendationsCount: number;
  randomCount: number;
  
  // Tag selection probabilities
  multiTagProbability: number; // 0-1: chance of using multiple tags
  maxTagsPerImage: number; // 1-4 (ComfyUI limit)
  
  // Close recommendations settings
  closeSwapProbability: number;
  closeAddProbability: number;
  closeDropProbability: number;
  closeMaxSwaps: number;
  
  // Mixed recommendations settings
  mixedPoolSize: number; // 2-3
  mixedTagMixProbability: number;
  
  // Random settings
  randomMinTags: number;
  randomMaxTags: number;
  
  // Style settings
  styleVariationProbability: number;
  
  // LoRA weight randomization
  loraWeightVariation: number; // 0-1
}

export interface UserPreferenceProfile {
  userId: string;
  likedImages: Array<{
    imageId: string;
    tags: Array<{ id: string; name: string; loras?: string[]; minStrength?: number; maxStrength?: number }>;
    style: { id: string; name: string; checkpointName?: string } | null;
    simpleTags: string[];
  }>;
  tagFrequency: Map<string, number>;
  styleFrequency: Map<string, number>;
  simpleTagFrequency: Map<string, number>;
  topTags: Array<{ id: string; name: string; count: number }>;
  topStyles: Array<{ id: string; name: string; count: number }>;
  topSimpleTags: Array<{ tag: string; count: number }>;
}

export interface GenerationResult {
  success: boolean;
  imageId?: string;
  error?: string;
  generationType: 'close' | 'mixed' | 'random';
  userId: string;
  prompt: string;
  tags: string[];
  style: string;
}

export interface GenerationReport {
  totalUsers: number;
  totalImagesGenerated: number;
  successCount: number;
  failureCount: number;
  results: GenerationResult[];
  errors: string[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

// ==================== Default Configuration ====================

export const DEFAULT_CONFIG: GenerationConfig = {
  imagesPerUser: 6,
  closeRecommendationsCount: 2,
  mixedRecommendationsCount: 2,
  randomCount: 2,
  
  multiTagProbability: 0.5,
  maxTagsPerImage: 4,
  
  closeSwapProbability: 0.4,
  closeAddProbability: 0.3,
  closeDropProbability: 0.2,
  closeMaxSwaps: 2,
  
  mixedPoolSize: 2,
  mixedTagMixProbability: 0.6,
  
  randomMinTags: 1,
  randomMaxTags: 3,
  
  styleVariationProbability: 0.3,
  
  loraWeightVariation: 0.5,
};

// ==================== Configuration Presets ====================

export const CONSERVATIVE_PRESET: Partial<GenerationConfig> = {
  closeSwapProbability: 0.2,
  closeAddProbability: 0.1,
  closeDropProbability: 0.1,
  multiTagProbability: 0.3,
  styleVariationProbability: 0.1,
  loraWeightVariation: 0.2,
};

export const BALANCED_PRESET: Partial<GenerationConfig> = {
  closeSwapProbability: 0.4,
  closeAddProbability: 0.3,
  closeDropProbability: 0.2,
  multiTagProbability: 0.5,
  styleVariationProbability: 0.3,
  loraWeightVariation: 0.5,
};

export const EXPLORATORY_PRESET: Partial<GenerationConfig> = {
  closeSwapProbability: 0.6,
  closeAddProbability: 0.5,
  closeDropProbability: 0.3,
  multiTagProbability: 0.7,
  styleVariationProbability: 0.5,
  loraWeightVariation: 0.8,
};

// ==================== User Preference Profile Builder ====================

export async function buildUserPreferenceProfile(userId: string): Promise<UserPreferenceProfile | null> {
  try {
    const likes = await prisma.like.findMany({
      where: {
        userId,
        isLike: true,
      },
      include: {
        image: {
          include: {
            imageTags: {
              include: {
                tag: true,
              },
            },
            imageStyles: {
              include: {
                style: true,
              },
            },
          },
        },
      },
    });

    if (likes.length === 0) {
      return null;
    }

    const likedImages = likes.map((like) => ({
      imageId: like.image.id,
      tags: like.image.imageTags.map((it) => ({
        id: it.tag.id,
        name: it.tag.name,
        loras: it.tag.loras,
        minStrength: it.tag.minStrength ?? undefined,
        maxStrength: it.tag.maxStrength ?? undefined,
      })),
      style: like.image.imageStyles[0]
        ? {
            id: like.image.imageStyles[0].style.id,
            name: like.image.imageStyles[0].style.name,
            checkpointName: like.image.imageStyles[0].style.checkpointName ?? undefined,
          }
        : null,
      simpleTags: like.image.promptTags
        ? like.image.promptTags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
        : [],
    }));

    const tagFrequency = new Map<string, number>();
    const styleFrequency = new Map<string, number>();
    const simpleTagFrequency = new Map<string, number>();

    likedImages.forEach((img) => {
      img.tags.forEach((tag) => {
        tagFrequency.set(tag.id, (tagFrequency.get(tag.id) || 0) + 1);
      });

      if (img.style) {
        styleFrequency.set(img.style.id, (styleFrequency.get(img.style.id) || 0) + 1);
      }

      img.simpleTags.forEach((tag) => {
        const normalized = tag.toLowerCase();
        simpleTagFrequency.set(normalized, (simpleTagFrequency.get(normalized) || 0) + 1);
      });
    });

    const topTags = Array.from(tagFrequency.entries())
      .map(([tagId, count]) => {
        const tag = likedImages
          .flatMap((img) => img.tags)
          .find((t) => t.id === tagId);
        return { id: tagId, name: tag?.name || '', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topStyles = Array.from(styleFrequency.entries())
      .map(([styleId, count]) => {
        const style = likedImages
          .map((img) => img.style)
          .find((s) => s?.id === styleId);
        return { id: styleId, name: style?.name || '', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topSimpleTags = Array.from(simpleTagFrequency.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      userId,
      likedImages,
      tagFrequency,
      styleFrequency,
      simpleTagFrequency,
      topTags,
      topStyles,
      topSimpleTags,
    };
  } catch (error) {
    console.error('Error building user preference profile:', error);
    return null;
  }
}

// ==================== Random Selection Utilities ====================

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function rollDice(probability: number): boolean {
  return Math.random() < probability;
}

// ==================== LoRA Weight Calculation ====================

function calculateLoraWeights(
  tags: any[],
  config: GenerationConfig,
  variationMultiplier: number
): number[] {
  return tags.map((tag) => {
    const minStrength = tag.minStrength ?? 1;
    const maxStrength = tag.maxStrength ?? 1;
    const baseWeight = randomFloat(minStrength, maxStrength);
    const variation = config.loraWeightVariation * variationMultiplier;
    const finalWeight = baseWeight + randomFloat(-variation, variation);
    return Math.max(0.1, Math.min(2.0, finalWeight));
  });
}

// ==================== Generation Functions ====================

async function generateCloseRecommendation(
  profile: UserPreferenceProfile,
  config: GenerationConfig,
  allTags: any[],
  allStyles: any[]
): Promise<{ tags: any[]; style: any; simpleTags: string[]; loraWeights: number[] }> {
  const baseImage = randomChoice(profile.likedImages);
  
  let selectedTags = [...baseImage.tags];
  let selectedSimpleTags = [...baseImage.simpleTags];
  
  selectedSimpleTags = selectedSimpleTags.filter(() => !rollDice(config.closeDropProbability));
  
  if (rollDice(config.closeAddProbability) && profile.topSimpleTags.length > 0) {
    const newTag = weightedRandomChoice(
      profile.topSimpleTags.map(t => t.tag),
      profile.topSimpleTags.map(t => t.count)
    );
    if (!selectedSimpleTags.includes(newTag)) {
      selectedSimpleTags.push(newTag);
    }
  }
  
  for (let i = 0; i < config.closeMaxSwaps; i++) {
    if (rollDice(config.closeSwapProbability) && selectedSimpleTags.length > 0 && profile.topSimpleTags.length > 0) {
      const indexToReplace = randomInt(0, selectedSimpleTags.length - 1);
      const newTag = weightedRandomChoice(
        profile.topSimpleTags.map(t => t.tag),
        profile.topSimpleTags.map(t => t.count)
      );
      selectedSimpleTags[indexToReplace] = newTag;
    }
  }
  
  selectedTags = selectedTags.slice(0, config.maxTagsPerImage);
  
  let selectedStyle = baseImage.style;
  if (rollDice(config.styleVariationProbability) && profile.topStyles.length > 0) {
    const styleChoice = weightedRandomChoice(
      profile.topStyles,
      profile.topStyles.map(s => s.count)
    );
    selectedStyle = allStyles.find(s => s.id === styleChoice.id) || selectedStyle;
  }
  
  if (!selectedStyle && profile.topStyles.length > 0) {
    const styleChoice = weightedRandomChoice(
      profile.topStyles,
      profile.topStyles.map(s => s.count)
    );
    selectedStyle = allStyles.find(s => s.id === styleChoice.id);
  }
  
  if (!selectedStyle) {
    selectedStyle = randomChoice(allStyles);
  }
  
  const loraWeights = calculateLoraWeights(selectedTags, config, 0.3);
  
  return {
    tags: selectedTags,
    style: selectedStyle,
    simpleTags: selectedSimpleTags,
    loraWeights,
  };
}

async function generateMixedRecommendation(
  profile: UserPreferenceProfile,
  config: GenerationConfig,
  allTags: any[],
  allStyles: any[]
): Promise<{ tags: any[]; style: any; simpleTags: string[]; loraWeights: number[] }> {
  const poolSize = Math.min(config.mixedPoolSize, profile.likedImages.length);
  const sourceImages = randomChoices(profile.likedImages, poolSize);
  
  const pooledTags = sourceImages.flatMap(img => img.tags);
  const pooledSimpleTags = sourceImages.flatMap(img => img.simpleTags);
  
  const uniqueTags = Array.from(new Map(pooledTags.map(t => [t.id, t])).values());
  const uniqueSimpleTags = Array.from(new Set(pooledSimpleTags));
  
  let selectedTags: any[];
  if (rollDice(config.multiTagProbability) && uniqueTags.length > 1) {
    const numTags = randomInt(2, Math.min(config.maxTagsPerImage, uniqueTags.length));
    selectedTags = randomChoices(uniqueTags, numTags);
  } else {
    selectedTags = uniqueTags.length > 0 ? [randomChoice(uniqueTags)] : [];
  }
  
  const numSimpleTags = randomInt(config.randomMinTags, Math.min(config.randomMaxTags, uniqueSimpleTags.length));
  const selectedSimpleTags = randomChoices(uniqueSimpleTags, numSimpleTags);
  
  let selectedStyle: any;
  if (rollDice(config.styleVariationProbability) && profile.topStyles.length > 0) {
    const styleChoice = weightedRandomChoice(
      profile.topStyles,
      profile.topStyles.map(s => s.count)
    );
    selectedStyle = allStyles.find(s => s.id === styleChoice.id);
  } else if (profile.topStyles.length > 0) {
    selectedStyle = allStyles.find(s => s.id === profile.topStyles[0].id);
  }
  
  if (!selectedStyle) {
    selectedStyle = randomChoice(allStyles);
  }
  
  const loraWeights = calculateLoraWeights(selectedTags, config, 0.6);
  
  return {
    tags: selectedTags,
    style: selectedStyle,
    simpleTags: selectedSimpleTags,
    loraWeights,
  };
}

async function generateRandomImage(
  config: GenerationConfig,
  allTags: any[],
  allStyles: any[]
): Promise<{ tags: any[]; style: any; simpleTags: string[]; loraWeights: number[] }> {
  const useMultipleTags = rollDice(config.multiTagProbability);
  const numTags = useMultipleTags
    ? randomInt(2, Math.min(config.maxTagsPerImage, 4))
    : 1;

  const selectedTags = randomChoices(allTags, numTags);
  const selectedStyle = randomChoice(allStyles);

  const commonSimpleTags = [
    'standing', 'sitting', 'smiling', 'looking at viewer',
    'outdoors', 'indoors', 'day', 'night',
    'solo', 'portrait', 'full body', 'upper body',
    'detailed', 'high quality', 'masterpiece',
  ];
  const numSimpleTags = randomInt(config.randomMinTags, config.randomMaxTags);
  const selectedSimpleTags = randomChoices(commonSimpleTags, numSimpleTags);

  const loraWeights = calculateLoraWeights(selectedTags, config, 1.0);

  return {
    tags: selectedTags,
    style: selectedStyle,
    simpleTags: selectedSimpleTags,
    loraWeights,
  };
}

// ==================== ComfyUI Integration ====================

async function callComfyUIAPI(
  promptTags: string,
  modelName: string,
  loraNames: string[],
  loraWeights: number[]
): Promise<string> {
  const comfyuiUrl = process.env.COMFYUI_API_URL;
  if (!comfyuiUrl) {
    throw new Error('COMFYUI_API_URL environment variable not set');
  }

  const requestBody: any = {
    prompt_tags: promptTags,
    model_name: modelName,
  };

  if (loraNames.length > 0) {
    requestBody.lora_name = loraNames.join(',');
    requestBody.lora_weight = loraWeights.map((w) => String(w)).join(',');
  }

  const response = await fetch(`${comfyuiUrl}/generate`, {
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

  return base64Image;
}

async function saveGeneratedImage(
  userId: string,
  base64Image: string,
  title: string,
  promptTags: string,
  tagIds: string[],
  styleId: string,
  generationType: string
): Promise<string> {
  const buffer = Buffer.from(base64Image, 'base64');

  const { processUploadedImage } = await import('@/lib/upload');

  const processedImage = await processUploadedImage(buffer, `generated_${Date.now()}.png`);

  const image = await prisma.$transaction(async (tx) => {
    const img = await tx.image.create({
      data: {
        userId,
        title,
        description: `Auto-generated image (${generationType})`,
        promptTags,
        imageUrl: processedImage.imageUrl,
        thumbnailUrl: processedImage.thumbnailUrl,
        filename: processedImage.filename,
        thumbnailFilename: processedImage.thumbnailFilename,
        width: processedImage.width,
        height: processedImage.height,
        size: processedImage.size,
      },
    });

    if (tagIds.length > 0) {
      await tx.imageTag.createMany({
        data: tagIds.map((tagId) => ({
          imageId: img.id,
          tagId,
        })),
      });

      await tx.tag.updateMany({
        where: { id: { in: tagIds } },
        data: { usageCount: { increment: 1 } },
      });
    }

    if (styleId) {
      await tx.imageStyle.create({
        data: {
          imageId: img.id,
          styleId,
        },
      });

      await tx.style.update({
        where: { id: styleId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return img;
  });

  return image.id;
}

// ==================== Main Generation Orchestrator ====================

export async function generateImagesForUser(
  userId: string,
  config: GenerationConfig = DEFAULT_CONFIG
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];

  try {
    const profile = await buildUserPreferenceProfile(userId);

    const allTags = await prisma.tag.findMany({
      where: {
        loras: { isEmpty: false },
      },
    });

    const allStyles = await prisma.style.findMany({
      where: {
        checkpointName: { not: null },
      },
    });

    if (allTags.length === 0 || allStyles.length === 0) {
      throw new Error('No tags or styles available for generation');
    }

    if (profile && profile.likedImages.length >= 2) {
      for (let i = 0; i < config.closeRecommendationsCount; i++) {
        try {
          const { tags, style, simpleTags, loraWeights } = await generateCloseRecommendation(
            profile,
            config,
            allTags,
            allStyles
          );

          const loraNames: string[] = [];
          tags.forEach((tag) => {
            if (tag.loras && Array.isArray(tag.loras)) {
              loraNames.push(...tag.loras.slice(0, 4 - loraNames.length));
            }
          });

          const tagNames = tags.map((t) => t.name).join(', ');
          const simpleTagsStr = simpleTags.join(', ');
          const fullPrompt = tagNames ? `${tagNames}, ${simpleTagsStr}` : simpleTagsStr;

          const base64Image = await callComfyUIAPI(
            fullPrompt,
            style.checkpointName,
            loraNames.slice(0, 4),
            loraWeights.slice(0, 4)
          );

          const imageId = await saveGeneratedImage(
            userId,
            base64Image,
            `Close Recommendation ${i + 1}`,
            simpleTagsStr,
            tags.map((t) => t.id),
            style.id,
            'close'
          );

          results.push({
            success: true,
            imageId,
            generationType: 'close',
            userId,
            prompt: fullPrompt,
            tags: tags.map((t) => t.name),
            style: style.name,
          });
        } catch (error: any) {
          console.error(`Error generating close recommendation ${i + 1}:`, error);
          results.push({
            success: false,
            error: error.message,
            generationType: 'close',
            userId,
            prompt: '',
            tags: [],
            style: '',
          });
        }
      }
    }

    if (profile && profile.likedImages.length >= 2) {
      for (let i = 0; i < config.mixedRecommendationsCount; i++) {
        try {
          const { tags, style, simpleTags, loraWeights } = await generateMixedRecommendation(
            profile,
            config,
            allTags,
            allStyles
          );

          const loraNames: string[] = [];
          tags.forEach((tag) => {
            if (tag.loras && Array.isArray(tag.loras)) {
              loraNames.push(...tag.loras.slice(0, 4 - loraNames.length));
            }
          });

          const tagNames = tags.map((t) => t.name).join(', ');
          const simpleTagsStr = simpleTags.join(', ');
          const fullPrompt = tagNames ? `${tagNames}, ${simpleTagsStr}` : simpleTagsStr;

          const base64Image = await callComfyUIAPI(
            fullPrompt,
            style.checkpointName,
            loraNames.slice(0, 4),
            loraWeights.slice(0, 4)
          );

          const imageId = await saveGeneratedImage(
            userId,
            base64Image,
            `Mixed Recommendation ${i + 1}`,
            simpleTagsStr,
            tags.map((t) => t.id),
            style.id,
            'mixed'
          );

          results.push({
            success: true,
            imageId,
            generationType: 'mixed',
            userId,
            prompt: fullPrompt,
            tags: tags.map((t) => t.name),
            style: style.name,
          });
        } catch (error: any) {
          console.error(`Error generating mixed recommendation ${i + 1}:`, error);
          results.push({
            success: false,
            error: error.message,
            generationType: 'mixed',
            userId,
            prompt: '',
            tags: [],
            style: '',
          });
        }
      }
    }

    for (let i = 0; i < config.randomCount; i++) {
      try {
        const { tags, style, simpleTags, loraWeights } = await generateRandomImage(
          config,
          allTags,
          allStyles
        );

        const loraNames: string[] = [];
        tags.forEach((tag) => {
          if (tag.loras && Array.isArray(tag.loras)) {
            loraNames.push(...tag.loras.slice(0, 4 - loraNames.length));
          }
        });

        const tagNames = tags.map((t) => t.name).join(', ');
        const simpleTagsStr = simpleTags.join(', ');
        const fullPrompt = tagNames ? `${tagNames}, ${simpleTagsStr}` : simpleTagsStr;

        const base64Image = await callComfyUIAPI(
          fullPrompt,
          style.checkpointName,
          loraNames.slice(0, 4),
          loraWeights.slice(0, 4)
        );

        const imageId = await saveGeneratedImage(
          userId,
          base64Image,
          `Random Generation ${i + 1}`,
          simpleTagsStr,
          tags.map((t) => t.id),
          style.id,
          'random'
        );

        results.push({
          success: true,
          imageId,
          generationType: 'random',
          userId,
          prompt: fullPrompt,
          tags: tags.map((t) => t.name),
          style: style.name,
        });
      } catch (error: any) {
        console.error(`Error generating random image ${i + 1}:`, error);
        results.push({
          success: false,
          error: error.message,
          generationType: 'random',
          userId,
          prompt: '',
          tags: [],
          style: '',
        });
      }
    }

  } catch (error: any) {
    console.error('Error in generateImagesForUser:', error);
    results.push({
      success: false,
      error: error.message,
      generationType: 'random',
      userId,
      prompt: '',
      tags: [],
      style: '',
    });
  }

  return results;
}

export async function generateImagesForAllUsers(
  config: GenerationConfig = DEFAULT_CONFIG
): Promise<GenerationReport> {
  const startTime = new Date();
  const results: GenerationResult[] = [];
  const errors: string[] = [];

  try {
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    console.log(`Starting auto-generation for ${users.length} users`);

    for (const user of users) {
      try {
        const userResults = await generateImagesForUser(user.id, config);
        results.push(...userResults);
      } catch (error: any) {
        console.error(`Error generating images for user ${user.id}:`, error);
        errors.push(`User ${user.id}: ${error.message}`);
      }
    }

    const endTime = new Date();
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      totalUsers: users.length,
      totalImagesGenerated: results.length,
      successCount,
      failureCount,
      results,
      errors,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
    };
  } catch (error: any) {
    console.error('Error in generateImagesForAllUsers:', error);
    const endTime = new Date();
    
    return {
      totalUsers: 0,
      totalImagesGenerated: 0,
      successCount: 0,
      failureCount: 0,
      results,
      errors: [error.message],
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
    };
  }
}