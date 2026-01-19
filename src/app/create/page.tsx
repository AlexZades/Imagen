"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { Sparkles, Loader2, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  loras?: string[];
  minStrength?: number;
  maxStrength?: number;
  forcedPromptTags?: string;
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

export default function CreatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [promptTags, setPromptTags] = useState('');
  const [loraConfigs, setLoraConfigs] = useState<LoraConfig[]>([]);
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user, router]);

  // Update LoRA configs when tags are selected
  useEffect(() => {
    const newConfigs: LoraConfig[] = [];
    
    selectedTagIds.forEach(tagId => {
      const tag = tags.find(t => t.id === tagId);
      if (tag && tag.loras && tag.loras.length > 0) {
        tag.loras.forEach(lora => {
          // Only add if we haven't reached 4 LoRAs yet
          if (newConfigs.length < 4) {
            const minStrength = tag.minStrength !== undefined ? tag.minStrength : 1;
            const maxStrength = tag.maxStrength !== undefined ? tag.maxStrength : 1;
            
            // Generate random weight between min and max
            const randomWeight = minStrength + Math.random() * (maxStrength - minStrength);
            
            newConfigs.push({
              name: lora,
              weight: parseFloat(randomWeight.toFixed(2)),
            });
          }
        });
      }
    });
    
    setLoraConfigs(newConfigs);
  }, [selectedTagIds, tags]);

  const fetchData = async () => {
    try {
      const [tagsRes, stylesRes] = await Promise.all([
        fetch('/api/tags'),
        fetch('/api/styles'),
      ]);

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
    setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
  };

  const handleGenerate = async () => {
    if (!promptTags.trim()) {
      toast.error('Please enter prompt tags');
      return;
    }

    if (!selectedStyle) {
      toast.error('Please select a style');
      return;
    }

    const selectedStyleObj = styles.find(s => s.id === selectedStyle);
    if (!selectedStyleObj?.checkpointName) {
      toast.error('Selected style must have a checkpoint name configured');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setShowReveal(false);

    try {
      // Randomize LoRA weights again on each generation
      const randomizedConfigs = loraConfigs.map(config => {
        const tag = selectedTagIds
          .map(id => tags.find(t => t.id === id))
          .find(t => t?.loras?.includes(config.name));
        
        if (tag) {
          const minStrength = tag.minStrength !== undefined ? tag.minStrength : 1;
          const maxStrength = tag.maxStrength !== undefined ? tag.maxStrength : 1;
          const randomWeight = minStrength + Math.random() * (maxStrength - minStrength);
          
          return {
            ...config,
            weight: parseFloat(randomWeight.toFixed(2))
          };
        }
        return config;
      });

      const loraNames = randomizedConfigs.map(config => config.name);
      const loraWeights = randomizedConfigs.map(config => config.weight);

      // Collect forced prompt tags from selected tags
      const forcedTags: string[] = [];
      selectedTagIds.forEach(tagId => {
        const tag = tags.find(t => t.id === tagId);
        if (tag?.forcedPromptTags) {
          forcedTags.push(tag.forcedPromptTags);
        }
      });

      // Combine user prompt tags with forced tags
      const allPromptTags = forcedTags.length > 0 
        ? `${forcedTags.join(', ')}, ${promptTags}`
        : promptTags;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_tags: allPromptTags,
          model_name: selectedStyleObj.checkpointName,
          lora_names: loraNames.length > 0 ? loraNames : undefined,
          lora_weights: loraWeights.length > 0 ? loraWeights : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedImage(`data:${data.contentType};base64,${data.image}`);
      setShowReveal(true);
      
      // Auto-fill title if empty
      if (!title) {
        const selectedTagNames = selectedTagIds
          .map(id => tags.find(t => t.id === id)?.name)
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
      const createResponse = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.id,
          title: title,
          promptTags: promptTags.trim() || undefined,
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

  const availableTagsForSelection = tags.filter(tag => !selectedTagIds.includes(tag.id));
  const forcedTagsPreview = selectedTagIds
    .map(tagId => tags.find(t => t.id === tagId)?.forcedPromptTags)
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

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 182, 193, 0.4),
                        0 0 40px rgba(221, 160, 221, 0.3),
                        0 0 60px rgba(173, 216, 230, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 182, 193, 0.6),
                        0 0 60px rgba(221, 160, 221, 0.5),
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
            #FFB6C1,
            #FFD4B2,
            #FFF4A3,
            #B4E7CE,
            #AED8E6,
            #C5B4E3,
            #E6B4D0,
            #FFB6C1,
            #FFD4B2,
            #FFF4A3,
            #B4E7CE,
            #AED8E6,
            #C5B4E3,
            #E6B4D0,
            #FFB6C1
          );
          background-size: 400% 400%;
          animation: fadeIn 0.8s ease-in, rainbow-scroll-diagonal 6s linear infinite;
          animation-delay: 0s, 0.8s;
        }

        .reveal-curtain {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            45deg,
            #FFB6C1,
            #FFD4B2,
            #FFF4A3,
            #B4E7CE,
            #AED8E6,
            #C5B4E3,
            #E6B4D0
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

        .sparkle-burst:nth-child(1) { --tx: -100px; --ty: -100px; animation-delay: 0s; }
        .sparkle-burst:nth-child(2) { --tx: 100px; --ty: -100px; animation-delay: 0.05s; }
        .sparkle-burst:nth-child(3) { --tx: -100px; --ty: 100px; animation-delay: 0.1s; }
        .sparkle-burst:nth-child(4) { --tx: 100px; --ty: 100px; animation-delay: 0.15s; }
        .sparkle-burst:nth-child(5) { --tx: 0px; --ty: -120px; animation-delay: 0.2s; }
        .sparkle-burst:nth-child(6) { --tx: 0px; --ty: 120px; animation-delay: 0.25s; }
        .sparkle-burst:nth-child(7) { --tx: -120px; --ty: 0px; animation-delay: 0.3s; }
        .sparkle-burst:nth-child(8) { --tx: 120px; --ty: 0px; animation-delay: 0.35s; }
        .sparkle-burst:nth-child(9) { --tx: -80px; --ty: -80px; animation-delay: 0.4s; }
        .sparkle-burst:nth-child(10) { --tx: 80px; --ty: 80px; animation-delay: 0.45s; }
        .sparkle-burst:nth-child(11) { --tx: 80px; --ty: -80px; animation-delay: 0.5s; }
        .sparkle-burst:nth-child(12) { --tx: -80px; --ty: 80px; animation-delay: 0.55s; }

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
          animation-delay: 1.0s;
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
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Create Image</h1>
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
                  <div className="space-y-2">
                    <Label htmlFor="style">Style</Label>
                    <Select
                      value={selectedStyle}
                      onValueChange={setSelectedStyle}
                      disabled={isLoadingData}
                    >
                      <SelectTrigger id="style">
                        <SelectValue placeholder={isLoadingData ? "Loading styles..." : "Select a style"} />
                      </SelectTrigger>
                      <SelectContent>
                        {styles.map((style) => (
                          <SelectItem key={style.id} value={style.id}>
                            {style.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedStyle && styles.find(s => s.id === selectedStyle)?.description && (
                      <p className="text-sm text-muted-foreground">
                        {styles.find(s => s.id === selectedStyle)?.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tags (Optional) - Max 4</Label>
                    <Select 
                      value="" 
                      onValueChange={handleAddTag}
                      disabled={selectedTagIds.length >= 4 || isLoadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          selectedTagIds.length >= 4 
                            ? "Maximum 4 tags reached" 
                            : "Add a tag..."
                        } />
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
                          const tag = tags.find(t => t.id === tagId);
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

                  {forcedTagsPreview && (
                    <div className="space-y-2">
                      <Label>Auto-included Tags</Label>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm text-muted-foreground">{forcedTagsPreview}</p>
                      </div>
                    </div>
                  )}

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

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !promptTags.trim() || !selectedStyle}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Image
                      </>
                    )}
                  </Button>
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
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Your generated image will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}