"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { useCredits } from '@/contexts/credits-context';
import { Sparkles, Loader2, Wand2, X, Shuffle } from 'lucide-react';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  description?: string;
  loras?: string[];
  minStrength?: number;
  maxStrength?: number;
  forcedPromptTags?: string;
  maleCharacterTags?: string;
  femaleCharacterTags?: string;
  otherCharacterTags?: string;
  slider?: boolean;
  sliderLowText?: string;
  sliderHighText?: string;
}

interface Style {
  id: string;
  name: string;
  description?: string;
  checkpointName?: string;
}

interface LoraConfig {
  name: string;
  weight: number;
}

function CreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser } = useAuth();
  const { creditsEnabled, creditCost } = useCredits();
  const [tags, setTags] = useState<Tag[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('1');
  const [promptTags, setPromptTags] = useState('');
  const [maleTags, setMaleTags] = useState('');
  const [femaleTags, setFemaleTags] = useState('');
  const [otherTags, setOtherTags] = useState('');
  
  const [loraConfigs, setLoraConfigs] = useState<LoraConfig[]>([]);
  const [cfgScale, setCfgScale] = useState<number>(6);
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showReveal, setShowReveal] = useState(false);
  const [isImageFadingOut, setIsImageFadingOut] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, router]);

  // Handle URL parameters for "Remix" functionality
  useEffect(() => {
    if (!isLoadingData && searchParams && searchParams.size > 0) {
      const styleIdParam = searchParams.get('styleId');
      const tagIdsParam = searchParams.get('tagIds');
      const promptParam = searchParams.get('promptTags');
      const aspectParam = searchParams.get('aspect');
      
      const maleTagsParam = searchParams.get('maleTags');
      const femaleTagsParam = searchParams.get('femaleTags');
      const otherTagsParam = searchParams.get('otherTags');
      const previousImageParam = searchParams.get('previousImage');

      // Note: We aren't restoring character tags from URL params yet as they weren't in the spec, 
      // but could be added if needed.

      if (styleIdParam && styles.some((s) => s.id === styleIdParam)) {
        setSelectedStyle(styleIdParam);
      }

      if (tagIdsParam) {
        const ids = tagIdsParam
          .split(',')
          .filter((id) => tags.some((t) => t.id === id));
        if (ids.length > 0) {
          setSelectedTagIds(ids);
        }
      }

      if (promptParam) {
        setPromptTags(promptParam);
      }

      if (aspectParam && ['1', '2', '3', '4'].includes(aspectParam)) {
        setAspectRatio(aspectParam);
      }
      
      if (maleTagsParam) setMaleTags(maleTagsParam);
      if (femaleTagsParam) setFemaleTags(femaleTagsParam);
      if (otherTagsParam) setOtherTags(otherTagsParam);

      if (previousImageParam) {
        setPreviousImage(previousImageParam);
      }
    }
  }, [isLoadingData, searchParams, styles, tags]);

  // Update LoRA configs when tags are selected
  useEffect(() => {
    setLoraConfigs((prevConfigs) => {
      const nextConfigs: LoraConfig[] = [];
      let currentCount = 0;

      for (const tagId of selectedTagIds) {
        const tag = tags.find((t) => t.id === tagId);
        if (tag && tag.loras && tag.loras.length > 0) {
          for (const lora of tag.loras) {
            if (currentCount >= 4) break;

            const existingConfig = prevConfigs.find((c) => c.name === lora);
            
            if (existingConfig) {
              nextConfigs.push(existingConfig);
            } else {
              const minStrength = tag.minStrength !== undefined ? tag.minStrength : 1;
              const maxStrength = tag.maxStrength !== undefined ? tag.maxStrength : 1;
              
              let weight;
              if (tag.slider) {
                // For slider tags, default to the middle value or max if equal
                weight = minStrength === maxStrength ? minStrength : (minStrength + maxStrength) / 2;
              } else {
                // For normal tags, random weight
                weight = minStrength + Math.random() * (maxStrength - minStrength);
              }

              nextConfigs.push({
                name: lora,
                weight: parseFloat(weight.toFixed(2)),
              });
            }
            currentCount++;
          }
        }
        if (currentCount >= 4) break;
      }
      return nextConfigs;
    });
  }, [selectedTagIds, tags]);

  const handleWeightChange = (tagId: string, newWeight: number) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag || !tag.loras) return;

    setLoraConfigs((prev) => 
      prev.map((config) => {
        if (tag.loras!.includes(config.name)) {
          return { ...config, weight: newWeight };
        }
        return config;
      })
    );
  };

  // Derived state for locked character tags
  const lockedMaleTags = selectedTagIds
    .map(id => tags.find(t => t.id === id)?.maleCharacterTags)
    .filter(Boolean)
    .join(', ');
  
  const lockedFemaleTags = selectedTagIds
    .map(id => tags.find(t => t.id === id)?.femaleCharacterTags)
    .filter(Boolean)
    .join(', ');

  const lockedOtherTags = selectedTagIds
    .map(id => tags.find(t => t.id === id)?.otherCharacterTags)
    .filter(Boolean)
    .join(', ');

  const fetchData = async () => {
    try {
      const tagsUrl = user?.nsfwEnabled ? '/api/tags?nsfw=true' : '/api/tags';
      const [tagsRes, stylesRes] = await Promise.all([fetch(tagsUrl), fetch('/api/styles')]);

      const tagsData = await tagsRes.json();
      const stylesData = await stylesRes.json();

      setTags(tagsData.tags || []);
      setStyles(stylesData.styles || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load tags and styles');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAddTag = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
  };

  const canAffordGeneration = user?.isAdmin || !creditsEnabled || (user?.creditsFree ?? 0) >= creditCost;

  const handleGenerate = async (customSeed?: number) => {
    if (!promptTags.trim() && !maleTags && !femaleTags && !otherTags && !lockedMaleTags && !lockedFemaleTags && !lockedOtherTags) {
      toast.error('Please enter prompt tags or characters');
      return;
    }

    if (!selectedStyle) {
      toast.error('Please select a style');
      return;
    }

    if (creditsEnabled && !canAffordGeneration) {
      toast.error('You do not have enough credits to generate an image');
      return;
    }

    const selectedStyleObj = styles.find((s) => s.id === selectedStyle);
    if (!selectedStyleObj?.checkpointName) {
      toast.error('Selected style must have a checkpoint name configured');
      return;
    }

    // Start the fade out process if an image exists
    if (generatedImage) {
      setPreviousImage(generatedImage);
      setIsImageFadingOut(true);
      // Wait for the fade-out animation to complete
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setShowReveal(false);

    try {
      // Randomize LoRA weights again on each generation (ONLY for non-slider tags)
      const randomizedConfigs = loraConfigs.map((config) => {
        const tag = selectedTagIds
          .map((id) => tags.find((t) => t.id === id))
          .find((t) => t?.loras?.includes(config.name));

        if (tag && !tag.slider) {
          const minStrength = tag.minStrength !== undefined ? tag.minStrength : 1;
          const maxStrength = tag.maxStrength !== undefined ? tag.maxStrength : 1;
          const randomWeight = minStrength + Math.random() * (maxStrength - minStrength);

          return {
            ...config,
            weight: parseFloat(randomWeight.toFixed(2)),
          };
        }
        return config;
      });

      const loraNames = randomizedConfigs.map((config) => config.name);
      const loraWeights = randomizedConfigs.map((config) => config.weight);

      // Construct character strings
      const allMaleTags = [lockedMaleTags, maleTags].filter(t => t && t.trim()).join(', ');
      const allFemaleTags = [lockedFemaleTags, femaleTags].filter(t => t && t.trim()).join(', ');
      const allOtherTags = [lockedOtherTags, otherTags].filter(t => t && t.trim()).join(', ');

      const maleCount = allMaleTags ? allMaleTags.split(',').length : 0;
      const femaleCount = allFemaleTags ? allFemaleTags.split(',').length : 0;

      let characterPromptParts: string[] = [];

      if (maleCount > 0) {
        characterPromptParts.push(maleCount === 1 ? "1boy" : `${maleCount}boys`);
        characterPromptParts.push(allMaleTags);
      }

      if (femaleCount > 0) {
        characterPromptParts.push(femaleCount === 1 ? "1girl" : `${femaleCount}girls`);
        characterPromptParts.push(allFemaleTags);
      }

      if (allOtherTags) {
        characterPromptParts.push(allOtherTags);
      }

      const characterPrompt = characterPromptParts.join(', ');

      // Collect forced prompt tags from selected tags
      const forcedTags: string[] = [];
      selectedTagIds.forEach((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        if (tag?.forcedPromptTags) {
          forcedTags.push(tag.forcedPromptTags);
        }
      });

      // Combine user prompt tags with forced tags and character tags
      let allPromptTags = promptTags;
      
      if (characterPrompt) {
        allPromptTags = `${characterPrompt}, ${allPromptTags}`;
      }
      
      if (forcedTags.length > 0) {
        allPromptTags = `${forcedTags.join(', ')}, ${allPromptTags}`;
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user!.id,
          consumeCredits: !user?.isAdmin,
          prompt_tags: allPromptTags,
          model_name: selectedStyleObj.checkpointName,
          lora_names: loraNames.length > 0 ? loraNames : undefined,
          lora_weights: loraWeights.length > 0 ? loraWeights : undefined,
          aspect: parseInt(aspectRatio),
          seed: customSeed,
          cfg: cfgScale,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedImage(`data:${data.contentType};base64,${data.image}`);
      setShowReveal(true);

      if (data?.credits && typeof data?.credits?.remainingFree === 'number') {
        updateUser({ creditsFree: data.credits.remainingFree });
      }

      // Auto-fill title if empty
      if (!title) {
        const selectedTagNames = selectedTagIds
          .map((id) => tags.find((t) => t.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        const autoTitle = selectedTagNames
          ? `${selectedTagNames} - ${selectedStyleObj.name}`
          : selectedStyleObj.name;
        setTitle(autoTitle);
      }

      toast.success('Image generated successfully!');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
      setIsImageFadingOut(false);
    }
  };

  const handleSave = async () => {
    if (!generatedImage) {
      toast.error('No image to save');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title for your image');
      return;
    }

    try {
      // Convert base64 to blob
      const base64Data = generatedImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Upload the file first
      const uploadFormData = new FormData();
      uploadFormData.append('file', blob, 'generated-image.png');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const { image: processedImage } = uploadData;

      // Create the image record in the database
      const allMaleTags = [lockedMaleTags, maleTags].filter(t => t && t.trim()).join(', ');
      const allFemaleTags = [lockedFemaleTags, femaleTags].filter(t => t && t.trim()).join(', ');
      const allOtherTags = [lockedOtherTags, otherTags].filter(t => t && t.trim()).join(', ');

      const createResponse = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.id,
          title: title,
          promptTags: promptTags.trim() || undefined,
          maleCharacterTags: allMaleTags || undefined,
          femaleCharacterTags: allFemaleTags || undefined,
          otherCharacterTags: allOtherTags || undefined,
          imageUrl: processedImage.imageUrl,
          thumbnailUrl: processedImage.thumbnailUrl,
          filename: processedImage.filename,
          thumbnailFilename: processedImage.thumbnailFilename,
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          tagIds: selectedTagIds,
          styleIds: selectedStyle ? [selectedStyle] : [],
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create image record');
      }

      const data = await createResponse.json();
      toast.success('Image saved successfully!');
      router.push(`/image/${data.image.id}`);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save image');
    }
  };

  if (!user) {
    return null;
  }

  const availableTagsForSelection = tags.filter((tag) => !selectedTagIds.includes(tag.id));
  const forcedTagsPreview = selectedTagIds
    .map((tagId) => tags.find((t) => t.id === tagId)?.forcedPromptTags)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes rainbow-scroll-diagonal {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 200%;
          }
        }

        @keyframes rainbow-scroll-horizontal {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(255, 182, 193, 0.4), 0 0 40px rgba(221, 160, 221, 0.3),
              0 0 60px rgba(173, 216, 230, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 182, 193, 0.6), 0 0 60px rgba(221, 160, 221, 0.5),
              0 0 90px rgba(173, 216, 230, 0.5);
          }
        }

        @keyframes curtainReveal {
          0% {
            clip-path: circle(0% at 50% 50%);
            opacity: 1;
          }
          100% {
            clip-path: circle(150% at 50% 50%);
            opacity: 0;
          }
        }

        @keyframes imageZoomIn {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes sparkleExplosion {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0);
            opacity: 0;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .pastel-rainbow-gradient-bg {
          background: linear-gradient(
            45deg,
            #ffb6c1,
            #ffd4b2,
            #fff4a3,
            #b4e7ce,
            #aed8e6,
            #c5b4e3,
            #e6b4d0,
            #ffb6c1,
            #ffd4b2,
            #fff4a3,
            #b4e7ce,
            #aed8e6,
            #c5b4e3,
            #e6b4d0,
            #ffb6c1
          );
          background-size: 400% 400%;
          animation: fadeIn 0.8s ease-in, rainbow-scroll-diagonal 6s linear infinite;
          animation-delay: 0s, 0.8s;
        }

        .rainbow-text {
          background: linear-gradient(
            90deg,
            #ff5fa2,
            #ffb86b,
            #fff27a,
            #7dffb2,
            #7ab8ff,
            #c57dff,
            #ff7ad1
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: rainbow-scroll-horizontal 4s linear infinite;
        }

        .reveal-curtain {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            45deg,
            #ffb6c1,
            #ffd4b2,
            #fff4a3,
            #b4e7ce,
            #aed8e6,
            #c5b4e3,
            #e6b4d0
          );
          animation: curtainReveal 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          z-index: 10;
        }

        .reveal-image {
          animation: imageZoomIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
        }

        .sparkle-burst {
          position: absolute;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.9);
          animation: sparkleExplosion 1s ease-out forwards;
          pointer-events: none;
        }

        .sparkle-burst:nth-child(1) {
          --tx: -100px;
          --ty: -100px;
          animation-delay: 0s;
        }
        .sparkle-burst:nth-child(2) {
          --tx: 100px;
          --ty: -100px;
          animation-delay: 0.05s;
        }
        .sparkle-burst:nth-child(3) {
          --tx: -100px;
          --ty: 100px;
          animation-delay: 0.1s;
        }
        .sparkle-burst:nth-child(4) {
          --tx: 100px;
          --ty: 100px;
          animation-delay: 0.15s;
        }
        .sparkle-burst:nth-child(5) {
          --tx: 0px;
          --ty: -120px;
          animation-delay: 0.2s;
        }
        .sparkle-burst:nth-child(6) {
          --tx: 0px;
          --ty: 120px;
          animation-delay: 0.25s;
        }
        .sparkle-burst:nth-child(7) {
          --tx: -120px;
          --ty: 0px;
          animation-delay: 0.3s;
        }
        .sparkle-burst:nth-child(8) {
          --tx: 120px;
          --ty: 0px;
          animation-delay: 0.35s;
        }
        .sparkle-burst:nth-child(9) {
          --tx: -80px;
          --ty: -80px;
          animation-delay: 0.4s;
        }
        .sparkle-burst:nth-child(10) {
          --tx: 80px;
          --ty: 80px;
          animation-delay: 0.45s;
        }
        .sparkle-burst:nth-child(11) {
          --tx: 80px;
          --ty: -80px;
          animation-delay: 0.5s;
        }
        .sparkle-burst:nth-child(12) {
          --tx: -80px;
          --ty: 80px;
          animation-delay: 0.55s;
        }

        .shimmer-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out 0.6s 1;
          pointer-events: none;
          z-index: 5;
        }

        .sparkle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
          animation: sparkle 2s ease-in-out infinite;
        }

        .sparkle:nth-child(1) {
          top: 15%;
          left: 20%;
          animation-delay: 0s;
        }

        .sparkle:nth-child(2) {
          top: 35%;
          left: 80%;
          animation-delay: 0.4s;
        }

        .sparkle:nth-child(3) {
          top: 55%;
          left: 25%;
          animation-delay: 0.8s;
        }

        .sparkle:nth-child(4) {
          top: 75%;
          left: 75%;
          animation-delay: 1.2s;
        }

        .sparkle:nth-child(5) {
          top: 25%;
          left: 50%;
          animation-delay: 1.6s;
        }

        .sparkle:nth-child(6) {
          top: 65%;
          left: 55%;
          animation-delay: 0.2s;
        }

        .sparkle:nth-child(7) {
          top: 45%;
          left: 10%;
          animation-delay: 0.6s;
        }

        .sparkle:nth-child(8) {
          top: 20%;
          left: 90%;
          animation-delay: 1s;
        }

        .sparkle:nth-child(9) {
          top: 85%;
          left: 40%;
          animation-delay: 1.4s;
        }

        .sparkle:nth-child(10) {
          top: 60%;
          left: 85%;
          animation-delay: 1.8s;
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Create Image</h1>
            </div>

            {creditsEnabled && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="rainbow-text font-semibold">
                  {user.isAdmin ? '∞' : (user.creditsFree ?? 0)} credits
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Controls */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generation Settings</CardTitle>
                  <CardDescription>Configure your image generation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="style">Style</Label>
                        <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={isLoadingData}>
                          <SelectTrigger id="style">
                            <SelectValue
                              placeholder={isLoadingData ? 'Loading styles...' : 'Select a style'}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {styles.map((style) => (
                              <SelectItem key={style.id} value={style.id}>
                                {style.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedStyle && styles.find((s) => s.id === selectedStyle)?.description && (
                          <p className="text-sm text-muted-foreground">
                            {styles.find((s) => s.id === selectedStyle)?.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aspect">Aspect Ratio</Label>
                        <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
                          <SelectTrigger id="aspect">
                            <SelectValue placeholder="Select aspect ratio" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Square (1:1)</SelectItem>
                            <SelectItem value="2">Portrait (3:4)</SelectItem>
                            <SelectItem value="3">Landscape (4:3)</SelectItem>
                            <SelectItem value="4">Landscape Wide (16:9)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tags (Optional) - Max 4</Label>
                        <Select
                          value=""
                          onValueChange={handleAddTag}
                          disabled={selectedTagIds.length >= 4 || isLoadingData}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                selectedTagIds.length >= 4
                                  ? 'Maximum 4 tags reached'
                                  : 'Add a tag...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTagsForSelection.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id}>
                                {tag.name}
                                {tag.loras && tag.loras.length > 0 && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({tag.loras.length} LoRA{tag.loras.length > 1 ? 's' : ''})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedTagIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedTagIds.map((tagId) => {
                              const tag = tags.find((t) => t.id === tagId);
                              return tag ? (
                                <Badge key={tagId} variant="secondary" className="gap-1">
                                  {tag.name}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={() => handleRemoveTag(tagId)}
                                  />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      {/* Slider Tags */}
                      {selectedTagIds.map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        if (!tag || !tag.slider || !tag.loras || tag.loras.length === 0) return null;

                        // Determine current weight from the first LoRA in this tag
                        // (Assuming all LoRAs in a tag share the same weight for now)
                        const loraName = tag.loras[0];
                        const config = loraConfigs.find(c => c.name === loraName);
                        const currentWeight = config ? config.weight : ((tag.minStrength || 0) + (tag.maxStrength || 1)) / 2;

                        return (
                          <div key={tagId} className="space-y-3 p-3 border rounded-md bg-muted/30">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-medium">{tag.name}</Label>
                              {tag.description && (
                                 <span className="text-xs text-muted-foreground">{tag.description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-16 text-right">
                                {tag.sliderLowText || 'Low'}
                              </span>
                              <Slider
                                value={[currentWeight]}
                                min={tag.minStrength ?? 0}
                                max={tag.maxStrength ?? 2}
                                step={0.05}
                                onValueChange={(vals) => handleWeightChange(tagId, vals[0])}
                                className="flex-1"
                              />
                              <span className="text-xs text-muted-foreground w-16">
                                {tag.sliderHighText || 'High'}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {forcedTagsPreview && (
                        <div className="space-y-2">
                          <Label>Auto-included Tags</Label>
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">{forcedTagsPreview}</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 border-t pt-4">
                        <Label>Characters</Label>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="maleTags" className="text-xs text-muted-foreground">Male</Label>
                            <Input
                              id="maleTags"
                              placeholder="Names..."
                              value={maleTags}
                              onChange={(e) => setMaleTags(e.target.value)}
                              disabled={isGenerating}
                              className="h-8 text-sm"
                            />
                            {lockedMaleTags && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {lockedMaleTags.split(',').map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                                    {tag.trim()}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="femaleTags" className="text-xs text-muted-foreground">Female</Label>
                            <Input
                              id="femaleTags"
                              placeholder="Names..."
                              value={femaleTags}
                              onChange={(e) => setFemaleTags(e.target.value)}
                              disabled={isGenerating}
                              className="h-8 text-sm"
                            />
                            {lockedFemaleTags && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {lockedFemaleTags.split(',').map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1 bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200">
                                    {tag.trim()}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="otherTags" className="text-xs text-muted-foreground">Other</Label>
                            <Input
                              id="otherTags"
                              placeholder="Names..."
                              value={otherTags}
                              onChange={(e) => setOtherTags(e.target.value)}
                              disabled={isGenerating}
                              className="h-8 text-sm"
                            />
                            {lockedOtherTags && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {lockedOtherTags.split(',').map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1 bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200">
                                    {tag.trim()}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                       <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="cfg-scale">CFG Scale (Creativity vs. Prompt Adherence)</Label>
                              <span className="text-sm font-medium">{cfgScale.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-12 text-right">Weak (5)</span>
                              <Slider
                                id="cfg-scale"
                                value={[cfgScale]}
                                min={5}
                                max={7}
                                step={0.1}
                                onValueChange={(vals) => setCfgScale(vals[0])}
                                className="flex-1"
                              />
                              <span className="text-xs text-muted-foreground w-12">Strong (7)</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Lower values (5) allow more creative freedom. Higher values (7) follow your prompt more strictly. Default is 6.
                            </p>
                          </div>
                       </div>
                    </TabsContent>
                  </Tabs>

                  <div className="space-y-2">
                    <Label htmlFor="promptTags">Prompt Tags</Label>
                    <Input
                      id="promptTags"
                      placeholder="e.g., 1girl, standing, outdoors, smile"
                      value={promptTags}
                      onChange={(e) => setPromptTags(e.target.value)}
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe the image you want to generate using comma-separated tags
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleGenerate()}
                      disabled={
                        isGenerating ||
                        !promptTags.trim() ||
                        !selectedStyle ||
                        (creditsEnabled && !canAffordGeneration)
                      }
                      className="flex-1"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : creditsEnabled && !canAffordGeneration ? (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Not enough credits
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generate Image
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => {
                        const randomSeed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                        handleGenerate(randomSeed);
                      }}
                      disabled={
                        isGenerating ||
                        !promptTags.trim() ||
                        !selectedStyle ||
                        (creditsEnabled && !canAffordGeneration)
                      }
                      variant="outline"
                      size="lg"
                      className="px-3"
                      title="Generate Slightly Different (Random Seed)"
                    >
                      <Shuffle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {generatedImage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Save Image</CardTitle>
                    <CardDescription>Give your creation a title</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter a title for your image"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={!title.trim()}
                      className="w-full"
                      variant="default"
                    >
                      Save to Gallery
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              <Card className="sticky top-4 z-20">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Your generated image will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`bg-muted rounded-lg flex items-center justify-center overflow-hidden relative transition-all duration-300 ${
                      aspectRatio === '1'
                        ? 'aspect-square'
                        : aspectRatio === '2'
                          ? 'aspect-[3/4]'
                          : aspectRatio === '3'
                            ? 'aspect-[4/3]'
                            : 'aspect-[16/9]'
                    }`}
                  >
                    {isGenerating ? (
                      <div className="absolute inset-0 pastel-rainbow-gradient-bg pulse-glow rounded-lg">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center z-10">
                            <div className="float-animation mb-4">
                              <Sparkles className="w-16 h-16 text-white mx-auto drop-shadow-lg" />
                            </div>
                            <p className="text-white font-semibold text-lg drop-shadow-lg">
                              Creating Magic...
                            </p>
                            <p className="text-white/90 text-sm mt-2 drop-shadow-lg">
                              This may take ~30 seconds
                            </p>
                          </div>

                          {/* Sparkles */}
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                          <div className="sparkle"></div>
                        </div>
                      </div>
                    ) : generatedImage ? (
                      <div className="relative w-full h-full">
                        <img
                          src={generatedImage}
                          alt="Generated"
                          className={`w-full h-full object-contain ${showReveal ? 'reveal-image' : ''}`}
                        />
                        {showReveal && (
                          <>
                            <div className="reveal-curtain"></div>
                            <div className="shimmer-overlay"></div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                              <div className="sparkle-burst" style={{ top: '50%', left: '50%' }}></div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No image generated yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {previousImage && (
                <Card className="opacity-80 hover:opacity-100 transition-opacity">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Previous Generation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`bg-muted rounded-lg flex items-center justify-center overflow-hidden relative transition-all duration-300 ${
                        aspectRatio === '1'
                          ? 'aspect-square'
                          : aspectRatio === '2'
                            ? 'aspect-[3/4]'
                            : aspectRatio === '3'
                              ? 'aspect-[4/3]'
                              : 'aspect-[16/9]'
                      }`}
                    >
                      <img
                        src={previousImage}
                        alt="Previous Generation"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CreateForm />
    </Suspense>
  );
}