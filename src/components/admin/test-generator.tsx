"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Wand2, Save, X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

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
  checkpointName?: string;
}

interface LoraConfig {
  name: string;
  weight: number;
  minStrength: number;
  maxStrength: number;
}

export function TestGenerator() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [promptTags, setPromptTags] = useState('');
  const [loraConfigs, setLoraConfigs] = useState<LoraConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fields for saving to database
  const [imageTitle, setImageTitle] = useState('');
  const [imageDescription, setImageDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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
              minStrength,
              maxStrength,
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

      setTags(tagsData.tags);
      setStyles(stylesData.styles);
    } catch (error) {
      toast.error('Failed to load tags and styles');
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

  const handleUpdateLoraWeight = (index: number, weight: number) => {
    const newConfigs = [...loraConfigs];
    newConfigs[index].weight = weight;
    setLoraConfigs(newConfigs);
  };

  const handleRandomizeWeight = (index: number) => {
    const config = loraConfigs[index];
    const randomWeight = config.minStrength + Math.random() * (config.maxStrength - config.minStrength);
    handleUpdateLoraWeight(index, parseFloat(randomWeight.toFixed(2)));
  };

  const handleGenerate = async () => {
    const selectedStyle = styles.find((s) => s.id === selectedStyleId);

    if (!selectedStyle?.checkpointName) {
      toast.error('Selected style must have a checkpoint name configured');
      return;
    }

    if (!promptTags.trim()) {
      toast.error('Please enter prompt tags');
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const loraNames = loraConfigs.map(config => config.name);
      const loraWeights = loraConfigs.map(config => config.weight);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          consumeCredits: true,
          prompt_tags: allPromptTags,
          model_name: selectedStyle.checkpointName,
          lora_names: loraNames.length > 0 ? loraNames : undefined,
          lora_weights: loraWeights.length > 0 ? loraWeights : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Generation failed');
      }

      const data = await response.json();

      if (data.image) {
        setGeneratedImage(data.image);
        
        // Auto-fill title if empty
        if (!imageTitle) {
          const selectedStyleName = selectedStyle.name;
          const selectedTagNames = selectedTagIds
            .map(id => tags.find(t => t.id === id)?.name)
            .filter(Boolean)
            .join(', ');
          const autoTitle = selectedTagNames 
            ? `${selectedTagNames} - ${selectedStyleName}`
            : selectedStyleName;
          setImageTitle(autoTitle);
        }
        
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image in response');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate image');
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!user) {
      toast.error('You must be logged in to save images');
      return;
    }

    if (!generatedImage) {
      toast.error('No image to save');
      return;
    }

    if (!imageTitle.trim()) {
      toast.error('Please enter a title for the image');
      return;
    }

    setIsSaving(true);

    try {
      // Convert base64 to blob
      const base64Response = await fetch(`data:image/png;base64,${generatedImage}`);
      const blob = await base64Response.blob();
      
      // Create a file from the blob
      const file = new File([blob], `generated_${Date.now()}.png`, { type: 'image/png' });

      // Upload the file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
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
          userId: user.id,
          title: imageTitle,
          description: imageDescription || undefined,
          promptTags: promptTags.trim() || undefined,
          imageUrl: processedImage.imageUrl,
          thumbnailUrl: processedImage.thumbnailUrl,
          filename: processedImage.filename,
          thumbnailFilename: processedImage.thumbnailFilename,
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          tagIds: selectedTagIds,
          styleIds: selectedStyleId ? [selectedStyleId] : [],
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create image record');
      }

      const data = await createResponse.json();
      toast.success('Image saved to database!');
      
      // Reset form
      setGeneratedImage(null);
      setImageTitle('');
      setImageDescription('');
      setPromptTags('');
      setSelectedTagIds([]);
      setSelectedStyleId('');
      setLoraConfigs([]);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to save image');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStyle = styles.find((s) => s.id === selectedStyleId);
  const availableTagsForSelection = tags.filter(tag => !selectedTagIds.includes(tag.id));

  // Get forced tags from selected tags
  const forcedTagsPreview = selectedTagIds
    .map(tagId => tags.find(t => t.id === tagId)?.forcedPromptTags)
    .filter(Boolean)
    .join(', ');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Image Generator</CardTitle>
        <CardDescription>
          Test the ComfyUI API integration with tags and styles from the database (up to 4 LoRAs)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Style (Model)</Label>
          <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a style..." />
            </SelectTrigger>
            <SelectContent>
              {styles.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  {style.name}
                  {style.checkpointName && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({style.checkpointName})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStyle && !selectedStyle.checkpointName && (
            <p className="text-xs text-destructive">
              This style needs a checkpoint name configured
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tags (LoRAs) - Max 4</Label>
          <Select 
            value="" 
            onValueChange={handleAddTag}
            disabled={selectedTagIds.length >= 4}
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
            <Label>Auto-included Tags (from selected tags)</Label>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">{forcedTagsPreview}</p>
            </div>
          </div>
        )}

        {loraConfigs.length > 0 && (
          <div className="space-y-3">
            <Label>LoRA Weights (randomized between min/max)</Label>
            {loraConfigs.map((config, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                      {config.name}
                    </code>
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={config.weight}
                    onChange={(e) => handleUpdateLoraWeight(index, parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRandomizeWeight(index)}
                    title="Randomize weight"
                  >
                    🎲
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground ml-1">
                  Range: {config.minStrength} - {config.maxStrength}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="promptTags">Prompt Tags</Label>
          <Input
            id="promptTags"
            value={promptTags}
            onChange={(e) => setPromptTags(e.target.value)}
            placeholder="e.g., 1girl, standing, outdoors, smile"
          />
          <p className="text-xs text-muted-foreground">
            These will be combined with any forced tags from selected tags
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedStyleId || !promptTags.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating... (this may take ~30 seconds)
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Image
            </>
          )}
        </Button>

        {generatedImage && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Generated Image</Label>
              <div className="border rounded-lg overflow-hidden bg-muted">
                <img
                  src={`data:image/png;base64,${generatedImage}`}
                  alt="Generated"
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Save to Database</h3>
              
              <div className="space-y-2">
                <Label htmlFor="imageTitle">Title *</Label>
                <Input
                  id="imageTitle"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder="Enter image title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageDescription">Description</Label>
                <Textarea
                  id="imageDescription"
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder="Enter image description..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSaveToDatabase}
                disabled={isSaving || !imageTitle.trim()}
                className="w-full"
                variant="default"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save to Database
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}