"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, RotateCcw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GenerationConfig {
  imagesPerUser: number;
  closeRecommendationsCount: number;
  mixedRecommendationsCount: number;
  randomCount: number;
  multiTagProbability: number;
  maxTagsPerImage: number;
  closeSwapProbability: number;
  closeAddProbability: number;
  closeDropProbability: number;
  closeMaxSwaps: number;
  mixedPoolSize: number;
  mixedTagMixProbability: number;
  randomMinTags: number;
  randomMaxTags: number;
  styleVariationProbability: number;
  loraWeightVariation: number;
}

const DEFAULT_CONFIG: GenerationConfig = {
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

const PRESETS = {
  conservative: {
    closeSwapProbability: 0.2,
    closeAddProbability: 0.1,
    closeDropProbability: 0.1,
    multiTagProbability: 0.3,
    styleVariationProbability: 0.1,
    loraWeightVariation: 0.2,
  },
  balanced: {
    closeSwapProbability: 0.4,
    closeAddProbability: 0.3,
    closeDropProbability: 0.2,
    multiTagProbability: 0.5,
    styleVariationProbability: 0.3,
    loraWeightVariation: 0.5,
  },
  exploratory: {
    closeSwapProbability: 0.6,
    closeAddProbability: 0.5,
    closeDropProbability: 0.3,
    multiTagProbability: 0.7,
    styleVariationProbability: 0.5,
    loraWeightVariation: 0.8,
  },
};

export function GenerationSettings({ userId }: { userId: string }) {
  const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
  const [isSaving, setSaving] = useState(false);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/generation-config?key=algorithm_settings');
      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          setConfig(JSON.parse(data.value));
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/generation-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          key: 'algorithm_settings',
          value: JSON.stringify(config),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setConfig(DEFAULT_CONFIG);
      toast.success('Settings reset to defaults');
    }
  };

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    setConfig({ ...config, ...PRESETS[presetName] });
    toast.success(`Applied ${presetName} preset`);
  };

  const updateConfig = (key: keyof GenerationConfig, value: number) => {
    setConfig({ ...config, [key]: value });
  };

  if (isLoading) {
    return <div className="p-4">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generation Algorithm Settings</CardTitle>
              <CardDescription>
                Configure the parameters for the automatic image generation system
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetToDefaults}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button onClick={saveConfig} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="close">Close Recs</TabsTrigger>
              <TabsTrigger value="mixed">Mixed Recs</TabsTrigger>
              <TabsTrigger value="random">Random</TabsTrigger>
              <TabsTrigger value="presets">Presets</TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <SettingSlider
                  label="Images Per User"
                  value={config.imagesPerUser}
                  onChange={(v) => updateConfig('imagesPerUser', v)}
                  min={1}
                  max={20}
                  step={1}
                  tooltip="Total number of images to generate per user in each batch"
                />

                <SettingSlider
                  label="Close Recommendations Count"
                  value={config.closeRecommendationsCount}
                  onChange={(v) => updateConfig('closeRecommendationsCount', v)}
                  min={0}
                  max={10}
                  step={1}
                  tooltip="Number of images based on slight variations of user's liked images"
                />

                <SettingSlider
                  label="Mixed Recommendations Count"
                  value={config.mixedRecommendationsCount}
                  onChange={(v) => updateConfig('mixedRecommendationsCount', v)}
                  min={0}
                  max={10}
                  step={1}
                  tooltip="Number of images mixing elements from multiple liked images"
                />

                <SettingSlider
                  label="Random Count"
                  value={config.randomCount}
                  onChange={(v) => updateConfig('randomCount', v)}
                  min={0}
                  max={10}
                  step={1}
                  tooltip="Number of completely random images to generate"
                />

                <SettingSlider
                  label="Multi-Tag Probability"
                  value={config.multiTagProbability}
                  onChange={(v) => updateConfig('multiTagProbability', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  isPercentage
                  tooltip="Probability of using multiple tags instead of just one"
                />

                <SettingSlider
                  label="Max Tags Per Image"
                  value={config.maxTagsPerImage}
                  onChange={(v) => updateConfig('maxTagsPerImage', v)}
                  min={1}
                  max={4}
                  step={1}
                  tooltip="Maximum number of tags (LoRAs) to use per image (ComfyUI limit: 4)"
                />

                <SettingSlider
                  label="Style Variation Probability"
                  value={config.styleVariationProbability}
                  onChange={(v) => updateConfig('styleVariationProbability', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  isPercentage
                  tooltip="Probability of using a different style than the base image"
                />

                <SettingSlider
                  label="LoRA Weight Variation"
                  value={config.loraWeightVariation}
                  onChange={(v) => updateConfig('loraWeightVariation', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  isPercentage
                  tooltip="Amount of random variation to apply to LoRA weights"
                />
              </div>
            </TabsContent>

            <TabsContent value="close" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <SettingSlider
                  label="Swap Probability"
                  value={config.closeSwapProbability}
                  onChange={(v) => updateConfig('closeSwapProbability', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  isPercentage
                  tooltip="Probability of swapping a simple tag with another from user's preferences"
                />

                <SettingSlider
                  label="Add Probability"
                  value={config.closeAddProbability}
                  onChange={(v) => updateConfig('closeAddProbability', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  isPercentage
                  tooltip="Probability of adding a new simple tag from user's preferences"
                />

                <SettingSlider
                  label="Drop Probability"
                  value={config.closeDropProbability}
                  onChange={(v) => updateConfig('closeDropProbability', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  isPercentage
                  tooltip="Probability of removing a simple tag from the base image"
                />

                <SettingSlider
                  label="Max Swaps"
                  value={config.closeMaxSwaps}
                  onChange={(v) => updateConfig('closeMaxSwaps', v)}
                  min={0}
                  max={5}
                  step={1}
                  tooltip="Maximum number of tag swap operations to perform"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Close Recommendations Strategy</h4>
                <p className="text-sm text-muted-foreground">
                  These settings control how the algorithm creates variations of images the user has liked.
                  Higher probabilities create more diverse variations, while lower values stay closer to the original.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="mixed" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <SettingSlider
                  label="Pool Size"
                  value={config.mixedPoolSize}
                  onChange={(v) => updateConfig('mixedPoolSize', v)}
                  min={2}
                  max={5}
                  step={1}
                  tooltip="Number of liked images to combine elements from"
                />

                <SettingSlider
                  label="Tag Mix Probability"
                  value={config.mixedTagMixProbability}
                  onChange={(v) => updateConfig('mixedTagMixProbability', v)}
                  min={0}
                  max={1}
                  step={0.05}
                  isPercentage
                  tooltip="Probability of mixing tags from different source images"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Mixed Recommendations Strategy</h4>
                <p className="text-sm text-muted-foreground">
                  These settings control how the algorithm combines elements from multiple liked images.
                  Larger pool sizes and higher mix probabilities create more experimental combinations.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="random" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <SettingSlider
                  label="Min Tags"
                  value={config.randomMinTags}
                  onChange={(v) => updateConfig('randomMinTags', v)}
                  min={1}
                  max={config.randomMaxTags}
                  step={1}
                  tooltip="Minimum number of simple tags for random images"
                />

                <SettingSlider
                  label="Max Tags"
                  value={config.randomMaxTags}
                  onChange={(v) => updateConfig('randomMaxTags', v)}
                  min={config.randomMinTags}
                  max={10}
                  step={1}
                  tooltip="Maximum number of simple tags for random images"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Random Generation Strategy</h4>
                <p className="text-sm text-muted-foreground">
                  These settings control completely random image generation, which helps users discover
                  new content outside their current preferences.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="presets" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => applyPreset('conservative')}>
                  <CardHeader>
                    <CardTitle className="text-lg">Conservative</CardTitle>
                    <CardDescription>
                      Minimal variation, stays very close to user preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div>• Low swap/add/drop probabilities</div>
                    <div>• Minimal style variation</div>
                    <div>• Tight LoRA weight ranges</div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => applyPreset('balanced')}>
                  <CardHeader>
                    <CardTitle className="text-lg">Balanced (Default)</CardTitle>
                    <CardDescription>
                      Good mix of familiarity and exploration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div>• Moderate variation probabilities</div>
                    <div>• Balanced style changes</div>
                    <div>• Standard LoRA weight ranges</div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => applyPreset('exploratory')}>
                  <CardHeader>
                    <CardTitle className="text-lg">Exploratory</CardTitle>
                    <CardDescription>
                      Maximum variation, discovers new content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div>• High variation probabilities</div>
                    <div>• Frequent style changes</div>
                    <div>• Wide LoRA weight ranges</div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">About Presets</h4>
                <p className="text-sm text-muted-foreground">
                  Presets provide quick starting points for different generation strategies. You can apply a preset
                  and then fine-tune individual settings. Remember to save your changes after applying a preset.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface SettingSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  tooltip: string;
  isPercentage?: boolean;
}

function SettingSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  tooltip,
  isPercentage = false,
}: SettingSliderProps) {
  const displayValue = isPercentage ? `${Math.round(value * 100)}%` : value.toString();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium">{displayValue}</span>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || min)}
          min={min}
          max={max}
          step={step}
          className="w-20"
        />
      </div>
    </div>
  );
}