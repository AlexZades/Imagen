"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { TestGenerator } from '@/components/admin/test-generator';
import { AutoGenerationTest } from '@/components/admin/auto-generation-test';
import { SimpleTagsViewer } from '@/components/admin/simple-tags-viewer';
import { FallbackTagsEditor } from '@/components/admin/fallback-tags-editor';
import { SpeechBubbleTriggersEditor } from '@/components/admin/speech-bubble-triggers-editor';
import { GenerationSettings } from '@/components/admin/generation-settings';
import { StorageMigration } from '@/components/admin/storage-migration';
import { CreditsSettings } from '@/components/admin/credits-settings';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, X, Save, Settings, Wrench } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  usageCount: number;
  loras?: string[];
  minStrength?: number;
  maxStrength?: number;
  forcedPromptTags?: string;
  nsfw?: boolean;
  maleCharacterTags?: string;
  femaleCharacterTags?: string;
  otherCharacterTags?: string;
  description?: string;
  slider?: boolean;
  sliderLowText?: string;
  sliderHighText?: string;
}

interface Style {
  id: string;
  name: string;
  description?: string;
  usageCount: number;
  checkpointName?: string;
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tag editing state
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagData, setEditTagData] = useState<Partial<Tag>>({});
  const [newLora, setNewLora] = useState('');

  // Style editing state
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [editStyleData, setEditStyleData] = useState<Partial<Style>>({});

  // New tag dialog state
  const [isNewTagDialogOpen, setIsNewTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagLoras, setNewTagLoras] = useState<string[]>([]);
  const [newTagLoraInput, setNewTagLoraInput] = useState('');
  const [newTagMinStrength, setNewTagMinStrength] = useState<number>(1);
  const [newTagMaxStrength, setNewTagMaxStrength] = useState<number>(1);
  const [newTagForcedPromptTags, setNewTagForcedPromptTags] = useState('');
  const [newTagNsfw, setNewTagNsfw] = useState(false);
  const [newTagMaleTags, setNewTagMaleTags] = useState('');
  const [newTagFemaleTags, setNewTagFemaleTags] = useState('');
  const [newTagOtherTags, setNewTagOtherTags] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagSlider, setNewTagSlider] = useState(false);
  const [newTagSliderLowText, setNewTagSliderLowText] = useState('');
  const [newTagSliderHighText, setNewTagSliderHighText] = useState('');

  // New style dialog state
  const [isNewStyleDialogOpen, setIsNewStyleDialogOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleDescription, setNewStyleDescription] = useState('');
  const [newStyleCheckpoint, setNewStyleCheckpoint] = useState('');

  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      toast.error('Unauthorized: Admin access required');
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [tagsRes, stylesRes] = await Promise.all([
        fetch('/api/tags?nsfw=true'),
        fetch('/api/styles'),
      ]);

      const tagsData = await tagsRes.json();
      const stylesData = await stylesRes.json();

      setTags(tagsData.tags || []);
      setStyles(stylesData.styles || []);
    } catch (error) {
      toast.error('Failed to load data');
      setTags([]);
      setStyles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Tag functions
  const startEditingTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditTagData({
      name: tag.name,
      loras: tag.loras || [],
      minStrength: tag.minStrength,
      maxStrength: tag.maxStrength,
      forcedPromptTags: tag.forcedPromptTags,
      nsfw: tag.nsfw,
      maleCharacterTags: tag.maleCharacterTags,
      femaleCharacterTags: tag.femaleCharacterTags,
      otherCharacterTags: tag.otherCharacterTags,
      description: tag.description,
      slider: tag.slider,
      sliderLowText: tag.sliderLowText,
      sliderHighText: tag.sliderHighText,
    });
  };

  const cancelEditingTag = () => {
    setEditingTagId(null);
    setEditTagData({});
    setNewLora('');
  };

  const handleAddLora = () => {
    if (newLora.trim() && editTagData.loras) {
      if (!editTagData.loras.includes(newLora.trim())) {
        setEditTagData({
          ...editTagData,
          loras: [...editTagData.loras, newLora.trim()],
        });
        setNewLora('');
      }
    } else if (newLora.trim()) {
      setEditTagData({
        ...editTagData,
        loras: [newLora.trim()],
      });
      setNewLora('');
    }
  };

  const handleRemoveLora = (lora: string) => {
    if (editTagData.loras) {
      setEditTagData({
        ...editTagData,
        loras: editTagData.loras.filter((l) => l !== lora),
      });
    }
  };

  const saveTag = async (tagId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/admin/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tagId,
          name: editTagData.name,
          loras: editTagData.loras,
          minStrength: editTagData.minStrength,
          maxStrength: editTagData.maxStrength,
          forcedPromptTags: editTagData.forcedPromptTags,
          nsfw: editTagData.nsfw,
          maleCharacterTags: editTagData.maleCharacterTags,
          femaleCharacterTags: editTagData.femaleCharacterTags,
          otherCharacterTags: editTagData.otherCharacterTags,
          description: editTagData.description,
          slider: editTagData.slider,
          sliderLowText: editTagData.sliderLowText,
          sliderHighText: editTagData.sliderHighText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tag');
      }

      toast.success('Tag updated successfully');
      cancelEditingTag();
      fetchData();
    } catch (error) {
      toast.error('Failed to update tag');
    }
  };

  const deleteTag = async (tagId: string) => {
    if (!user || !confirm('Are you sure you want to delete this tag?')) return;

    try {
      const response = await fetch(`/api/admin/tags?userId=${user.id}&tagId=${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      toast.success('Tag deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  // Style functions
  const startEditingStyle = (style: Style) => {
    setEditingStyleId(style.id);
    setEditStyleData({
      name: style.name,
      description: style.description,
      checkpointName: style.checkpointName,
    });
  };

  const cancelEditingStyle = () => {
    setEditingStyleId(null);
    setEditStyleData({});
  };

  const saveStyle = async (styleId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/admin/styles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          styleId,
          name: editStyleData.name,
          description: editStyleData.description,
          checkpointName: editStyleData.checkpointName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update style');
      }

      toast.success('Style updated successfully');
      cancelEditingStyle();
      fetchData();
    } catch (error) {
      toast.error('Failed to update style');
    }
  };

  const deleteStyle = async (styleId: string) => {
    if (!user || !confirm('Are you sure you want to delete this style?')) return;

    try {
      const response = await fetch(`/api/admin/styles?userId=${user.id}&styleId=${styleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete style');
      }

      toast.success('Style deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete style');
    }
  };

  // New tag functions
  const handleAddNewTagLora = () => {
    if (newTagLoraInput.trim() && !newTagLoras.includes(newTagLoraInput.trim())) {
      setNewTagLoras([...newTagLoras, newTagLoraInput.trim()]);
      setNewTagLoraInput('');
    }
  };

  const handleRemoveNewTagLora = (lora: string) => {
    setNewTagLoras(newTagLoras.filter((l) => l !== lora));
  };

  const handleCreateTag = async () => {
    if (!user || !newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          loras: newTagLoras.length > 0 ? newTagLoras : undefined,
          minStrength: newTagMinStrength,
          maxStrength: newTagMaxStrength,
          forcedPromptTags: newTagForcedPromptTags.trim() || undefined,
          nsfw: newTagNsfw,
          maleCharacterTags: newTagMaleTags.trim() || undefined,
          femaleCharacterTags: newTagFemaleTags.trim() || undefined,
          otherCharacterTags: newTagOtherTags.trim() || undefined,
          description: newTagDescription.trim() || undefined,
          slider: newTagSlider,
          sliderLowText: newTagSliderLowText.trim() || undefined,
          sliderHighText: newTagSliderHighText.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create tag');
      }

      toast.success('Tag created successfully');
      setIsNewTagDialogOpen(false);
      setNewTagName('');
      setNewTagLoras([]);
      setNewTagLoraInput('');
      setNewTagMinStrength(1);
      setNewTagMaxStrength(1);
      setNewTagForcedPromptTags('');
      setNewTagNsfw(false);
      setNewTagMaleTags('');
      setNewTagFemaleTags('');
      setNewTagOtherTags('');
      setNewTagDescription('');
      setNewTagSlider(false);
      setNewTagSliderLowText('');
      setNewTagSliderHighText('');
      fetchData();
    } catch (error) {
      toast.error('Failed to create tag');
    }
  };

  // New style functions
  const handleCreateStyle = async () => {
    if (!user || !newStyleName.trim()) {
      toast.error('Style name is required');
      return;
    }

    try {
      const response = await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStyleName.trim(),
          description: newStyleDescription.trim() || undefined,
          checkpointName: newStyleCheckpoint.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create style');
      }

      toast.success('Style created successfully');
      setIsNewStyleDialogOpen(false);
      setNewStyleName('');
      setNewStyleDescription('');
      setNewStyleCheckpoint('');
      fetchData();
    } catch (error) {
      toast.error('Failed to create style');
    }
  };

  const handleRegenerateThumbnails = async () => {
    if (!user || !confirm('This will regenerate thumbnails for ALL images. This may take a while. Continue?')) return;

    setIsRegenerating(true);
    try {
      const response = await fetch('/api/admin/regenerate-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to regenerate thumbnails');
      }

      toast.success(`Thumbnails regenerated: ${data.processed} processed, ${data.errors} errors`);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

        <Tabs defaultValue="generator" className="w-full">
          <TabsList>
            <TabsTrigger value="generator">Test Generator</TabsTrigger>
            <TabsTrigger value="auto-generation">Auto-Generation</TabsTrigger>
            <TabsTrigger value="generation-settings">Algorithm Settings</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="styles">Styles</TabsTrigger>
            <TabsTrigger value="simple-tags">Simple Tags</TabsTrigger>
            <TabsTrigger value="fallback-tags">Fallback Tags</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="mt-6">
            <TestGenerator />
          </TabsContent>

          <TabsContent value="auto-generation" className="mt-6">
            <AutoGenerationTest />
          </TabsContent>

          <TabsContent value="generation-settings" className="mt-6">
            <GenerationSettings userId={user.id} />
          </TabsContent>

          <TabsContent value="credits" className="mt-6">
            <CreditsSettings />
          </TabsContent>

          <TabsContent value="simple-tags" className="mt-6">
            <SimpleTagsViewer />
          </TabsContent>

          <TabsContent value="fallback-tags" className="mt-6">
            <div className="space-y-6">
                <FallbackTagsEditor />
                <SpeechBubbleTriggersEditor />
            </div>
          </TabsContent>

          <TabsContent value="tags" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage Tags</CardTitle>
                    <CardDescription>
                      Configure LoRA settings for tags used in image generation
                    </CardDescription>
                  </div>
                  <Dialog open={isNewTagDialogOpen} onOpenChange={setIsNewTagDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Tag
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Tag</DialogTitle>
                        <DialogDescription>
                          Add a new tag with optional LoRA configurations
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="newTagName">Tag Name *</Label>
                          <Input
                            id="newTagName"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="Enter tag name..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newTagDescription">Description</Label>
                          <Textarea
                            id="newTagDescription"
                            value={newTagDescription}
                            onChange={(e) => setNewTagDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>LoRAs</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newTagLoraInput}
                              onChange={(e) => setNewTagLoraInput(e.target.value)}
                              placeholder="Add LoRA filename..."
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddNewTagLora();
                                }
                              }}
                            />
                            <Button type="button" onClick={handleAddNewTagLora}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          {newTagLoras.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {newTagLoras.map((lora, idx) => (
                                <Badge key={idx} variant="secondary" className="gap-1">
                                  {lora}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={() => handleRemoveNewTagLora(lora)}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="newTagMinStrength">Min Strength</Label>
                            <Input
                              id="newTagMinStrength"
                              type="number"
                              step="0.1"
                              value={newTagMinStrength}
                              onChange={(e) => setNewTagMinStrength(parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newTagMaxStrength">Max Strength</Label>
                            <Input
                              id="newTagMaxStrength"
                              type="number"
                              step="0.1"
                              value={newTagMaxStrength}
                              onChange={(e) => setNewTagMaxStrength(parseFloat(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newTagForcedPromptTags">Forced Prompt Tags</Label>
                          <Input
                            id="newTagForcedPromptTags"
                            value={newTagForcedPromptTags}
                            onChange={(e) => setNewTagForcedPromptTags(e.target.value)}
                            placeholder="tag1, tag2, tag3"
                          />
                          <p className="text-xs text-muted-foreground">
                            These tags will be automatically included in the prompt when this tag is selected
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="newTagMaleTags">Male Character Tags</Label>
                            <Input
                              id="newTagMaleTags"
                              value={newTagMaleTags}
                              onChange={(e) => setNewTagMaleTags(e.target.value)}
                              placeholder="e.g. 1boy"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newTagFemaleTags">Female Character Tags</Label>
                            <Input
                              id="newTagFemaleTags"
                              value={newTagFemaleTags}
                              onChange={(e) => setNewTagFemaleTags(e.target.value)}
                              placeholder="e.g. 1girl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newTagOtherTags">Other Character Tags</Label>
                            <Input
                              id="newTagOtherTags"
                              value={newTagOtherTags}
                              onChange={(e) => setNewTagOtherTags(e.target.value)}
                              placeholder="e.g. 1robot"
                            />
                          </div>
                          <p className="col-span-3 text-xs text-muted-foreground">
                            These tags will be added to the character count boxes when selected
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                          <Switch
                            id="newTagNsfw"
                            checked={newTagNsfw}
                            onCheckedChange={setNewTagNsfw}
                          />
                          <Label htmlFor="newTagNsfw">NSFW Content</Label>
                        </div>
                        
                        <div className="space-y-4 border-t pt-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="newTagSlider"
                              checked={newTagSlider}
                              onCheckedChange={setNewTagSlider}
                            />
                            <Label htmlFor="newTagSlider">Enable Slider</Label>
                          </div>
                          
                          {newTagSlider && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="newTagSliderLowText">Slider Low Text</Label>
                                <Input
                                  id="newTagSliderLowText"
                                  value={newTagSliderLowText}
                                  onChange={(e) => setNewTagSliderLowText(e.target.value)}
                                  placeholder="e.g. Weak"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="newTagSliderHighText">Slider High Text</Label>
                                <Input
                                  id="newTagSliderHighText"
                                  value={newTagSliderHighText}
                                  onChange={(e) => setNewTagSliderHighText(e.target.value)}
                                  placeholder="e.g. Strong"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewTagDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTag}>Create Tag</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>LoRAs</TableHead>
                      <TableHead>Strength Range</TableHead>
                      <TableHead>Forced Tags</TableHead>
                      <TableHead>Character Tags</TableHead>
                      <TableHead>NSFW</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No tags found. Create your first tag to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tags.map((tag) => (
                        <TableRow key={tag.id}>
                          {editingTagId === tag.id ? (
                            <>
                              <TableCell>
                                <div className="space-y-2">
                                  <Input
                                    value={editTagData.name || ''}
                                    onChange={(e) =>
                                      setEditTagData({ ...editTagData, name: e.target.value })
                                    }
                                    className="max-w-xs"
                                    placeholder="Name"
                                  />
                                  <Textarea
                                    value={editTagData.description || ''}
                                    onChange={(e) =>
                                      setEditTagData({ ...editTagData, description: e.target.value })
                                    }
                                    className="max-w-xs text-xs"
                                    placeholder="Description"
                                    rows={2}
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      value={newLora}
                                      onChange={(e) => setNewLora(e.target.value)}
                                      placeholder="Add LoRA..."
                                      className="max-w-xs"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddLora();
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={handleAddLora}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {editTagData.loras?.map((lora, idx) => (
                                      <Badge key={idx} variant="secondary" className="gap-1">
                                        {lora}
                                        <X
                                          className="w-3 h-3 cursor-pointer"
                                          onClick={() => handleRemoveLora(lora)}
                                        />
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editTagData.minStrength ?? ''}
                                    onChange={(e) =>
                                      setEditTagData({
                                        ...editTagData,
                                        minStrength: e.target.value ? parseFloat(e.target.value) : undefined,
                                      })
                                    }
                                    className="max-w-[80px]"
                                    placeholder="Min"
                                  />
                                  <span className="text-muted-foreground">-</span>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editTagData.maxStrength ?? ''}
                                    onChange={(e) =>
                                      setEditTagData({
                                        ...editTagData,
                                        maxStrength: e.target.value ? parseFloat(e.target.value) : undefined,
                                      })
                                    }
                                    className="max-w-[80px]"
                                    placeholder="Max"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={editTagData.slider || false}
                                    onCheckedChange={(checked) =>
                                      setEditTagData({ ...editTagData, slider: checked })
                                    }
                                  />
                                  <Label className="text-xs">Slider</Label>
                                </div>
                                {editTagData.slider && (
                                  <div className="grid grid-cols-2 gap-1">
                                    <Input
                                      value={editTagData.sliderLowText || ''}
                                      onChange={(e) =>
                                        setEditTagData({ ...editTagData, sliderLowText: e.target.value })
                                      }
                                      placeholder="Low txt"
                                      className="h-6 text-xs"
                                    />
                                    <Input
                                      value={editTagData.sliderHighText || ''}
                                      onChange={(e) =>
                                        setEditTagData({ ...editTagData, sliderHighText: e.target.value })
                                      }
                                      placeholder="High txt"
                                      className="h-6 text-xs"
                                    />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editTagData.forcedPromptTags || ''}
                                  onChange={(e) =>
                                    setEditTagData({ ...editTagData, forcedPromptTags: e.target.value })
                                  }
                                  className="max-w-xs"
                                  placeholder="tag1, tag2"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2 min-w-[200px]">
                                  <Input
                                    value={editTagData.maleCharacterTags || ''}
                                    onChange={(e) =>
                                      setEditTagData({ ...editTagData, maleCharacterTags: e.target.value })
                                    }
                                    placeholder="Male tags"
                                    className="h-8"
                                  />
                                  <Input
                                    value={editTagData.femaleCharacterTags || ''}
                                    onChange={(e) =>
                                      setEditTagData({ ...editTagData, femaleCharacterTags: e.target.value })
                                    }
                                    placeholder="Female tags"
                                    className="h-8"
                                  />
                                  <Input
                                    value={editTagData.otherCharacterTags || ''}
                                    onChange={(e) =>
                                      setEditTagData({ ...editTagData, otherCharacterTags: e.target.value })
                                    }
                                    placeholder="Other tags"
                                    className="h-8"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={editTagData.nsfw || false}
                                  onCheckedChange={(checked) =>
                                    setEditTagData({ ...editTagData, nsfw: checked })
                                  }
                                />
                              </TableCell>
                              <TableCell>{tag.usageCount}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => saveTag(tag.id)}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditingTag}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium">
                                <div className="font-medium">{tag.name}</div>
                                {tag.description && <div className="text-xs text-muted-foreground">{tag.description}</div>}
                              </TableCell>
                              <TableCell>
                                {tag.loras && tag.loras.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {tag.loras.map((lora, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {lora}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {tag.minStrength !== undefined ? tag.minStrength : '-'} - {tag.maxStrength !== undefined ? tag.maxStrength : '-'}
                                </span>
                                {tag.slider && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Slider: {tag.sliderLowText || 'Low'} / {tag.sliderHighText || 'High'}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {tag.forcedPromptTags ? (
                                  <span className="text-sm">{tag.forcedPromptTags}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {tag.maleCharacterTags && <div className="text-xs"><span className="font-semibold text-blue-500">M:</span> {tag.maleCharacterTags}</div>}
                                  {tag.femaleCharacterTags && <div className="text-xs"><span className="font-semibold text-pink-500">F:</span> {tag.femaleCharacterTags}</div>}
                                  {tag.otherCharacterTags && <div className="text-xs"><span className="font-semibold text-purple-500">O:</span> {tag.otherCharacterTags}</div>}
                                  {!tag.maleCharacterTags && !tag.femaleCharacterTags && !tag.otherCharacterTags && (
                                    <span className="text-muted-foreground text-sm">None</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {tag.nsfw ? (
                                  <Badge variant="destructive" className="text-xs">NSFW</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">Safe</Badge>
                                )}
                              </TableCell>
                              <TableCell>{tag.usageCount}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditingTag(tag)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteTag(tag.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="styles" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage Styles</CardTitle>
                    <CardDescription>
                      Configure checkpoint/model settings for styles
                    </CardDescription>
                  </div>
                  <Dialog open={isNewStyleDialogOpen} onOpenChange={setIsNewStyleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Style
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Style</DialogTitle>
                        <DialogDescription>
                          Add a new style with checkpoint configuration
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="newStyleName">Style Name *</Label>
                          <Input
                            id="newStyleName"
                            value={newStyleName}
                            onChange={(e) => setNewStyleName(e.target.value)}
                            placeholder="Enter style name..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newStyleDescription">Description</Label>
                          <Textarea
                            id="newStyleDescription"
                            value={newStyleDescription}
                            onChange={(e) => setNewStyleDescription(e.target.value)}
                            placeholder="Enter style description..."
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newStyleCheckpoint">Checkpoint Name</Label>
                          <Input
                            id="newStyleCheckpoint"
                            value={newStyleCheckpoint}
                            onChange={(e) => setNewStyleCheckpoint(e.target.value)}
                            placeholder="model_name.safetensors"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewStyleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateStyle}>Create Style</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Checkpoint</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {styles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No styles found. Create your first style to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      styles.map((style) => (
                        <TableRow key={style.id}>
                          {editingStyleId === style.id ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editStyleData.name || ''}
                                  onChange={(e) =>
                                    setEditStyleData({ ...editStyleData, name: e.target.value })
                                  }
                                  className="max-w-xs"
                                />
                              </TableCell>
                              <TableCell>
                                <Textarea
                                  value={editStyleData.description || ''}
                                  onChange={(e) =>
                                    setEditStyleData({ ...editStyleData, description: e.target.value })
                                  }
                                  className="max-w-md"
                                  rows={2}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editStyleData.checkpointName || ''}
                                  onChange={(e) =>
                                    setEditStyleData({ ...editStyleData, checkpointName: e.target.value })
                                  }
                                  className="max-w-xs"
                                  placeholder="model_name.safetensors"
                                />
                              </TableCell>
                              <TableCell>{style.usageCount}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => saveStyle(style.id)}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditingStyle}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium">{style.name}</TableCell>
                              <TableCell>
                                {style.description ? (
                                  <span className="text-sm">{style.description}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No description</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {style.checkpointName ? (
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {style.checkpointName}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Not set</span>
                                )}
                              </TableCell>
                              <TableCell>{style.usageCount}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditingStyle(style)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteStyle(style.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>System Maintenance</CardTitle>
                <CardDescription>
                  Perform system-wide maintenance tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Regenerate Thumbnails</h3>
                      <p className="text-sm text-muted-foreground">
                        Re-creates thumbnail images for all uploaded photos. Useful if you've changed thumbnail dimensions or if files are missing.
                      </p>
                    </div>
                    <Button 
                      onClick={handleRegenerateThumbnails} 
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <>
                          <Wrench className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Wrench className="w-4 h-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>

                  <StorageMigration userId={user.id} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}