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
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {isGenerating ? (
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Generating your image...</p>
                        <p className="text-xs text-muted-foreground mt-2">This may take ~30 seconds</p>
                      </div>
                    ) : generatedImage ? (
                      <img
                        src={generatedImage}
                        alt="Generated"
                        className="w-full h-full object-contain"
                      />
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