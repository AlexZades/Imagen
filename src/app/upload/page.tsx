"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Upload as UploadIcon, Image as ImageIcon } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
}

interface Style {
  id: string;
  name: string;
}

export default function UploadPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptTags, setPromptTags] = useState('');
  const [contentRating, setContentRating] = useState('safe');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableStyles, setAvailableStyles] = useState<Style[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newStyleName, setNewStyleName] = useState('');

  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [styleSuggestions, setStyleSuggestions] = useState<Style[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showStyleSuggestions, setShowStyleSuggestions] = useState(false);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(-1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading) {
      fetchTags();
      fetchStyles();
    }
  }, [authLoading, user?.nsfwEnabled]);

  useEffect(() => {
    if (newTagName.trim()) {
      const filtered = availableTags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(newTagName.toLowerCase()) &&
          !selectedTags.find((t) => t.id === tag.id)
      );
      setTagSuggestions(filtered);
      setShowTagSuggestions(filtered.length > 0);
      setSelectedTagIndex(-1);
    } else {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    }
  }, [newTagName, availableTags, selectedTags]);

  useEffect(() => {
    if (newStyleName.trim()) {
      const filtered = availableStyles.filter((style) =>
        style.name.toLowerCase().includes(newStyleName.toLowerCase())
      );
      setStyleSuggestions(filtered);
      setShowStyleSuggestions(filtered.length > 0);
      setSelectedStyleIndex(-1);
    } else {
      setStyleSuggestions([]);
      setShowStyleSuggestions(false);
    }
  }, [newStyleName, availableStyles]);

  const fetchTags = async () => {
    try {
      const nsfwParam = user?.nsfwEnabled ? '?nsfw=true' : '';
      const response = await fetch(`/api/tags${nsfwParam}`);
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setAvailableTags([]);
    }
  };

  const fetchStyles = async () => {
    try {
      const response = await fetch('/api/styles');
      const data = await response.json();
      setAvailableStyles(data.styles || []);
    } catch (error) {
      console.error('Error fetching styles:', error);
      setAvailableStyles([]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const selectTagFromSuggestion = (tag: Tag) => {
    if (!selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setNewTagName('');
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const selectStyleFromSuggestion = (style: Style) => {
    setSelectedStyle(style);
    setNewStyleName('');
    setShowStyleSuggestions(false);
    styleInputRef.current?.focus();
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (!showTagSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedTagIndex((prev) =>
        prev < tagSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedTagIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedTagIndex >= 0) {
      e.preventDefault();
      selectTagFromSuggestion(tagSuggestions[selectedTagIndex]);
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const handleStyleKeyDown = (e: React.KeyboardEvent) => {
    if (!showStyleSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedStyleIndex((prev) =>
        prev < styleSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedStyleIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedStyleIndex >= 0) {
      e.preventDefault();
      selectStyleFromSuggestion(styleSuggestions[selectedStyleIndex]);
    } else if (e.key === 'Escape') {
      setShowStyleSuggestions(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    const exactMatch = tagSuggestions.find(
      (tag) => tag.name.toLowerCase() === newTagName.toLowerCase()
    );

    if (exactMatch) {
      selectTagFromSuggestion(exactMatch);
      return;
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      const data = await response.json();
      const tag = data.tag;

      if (tag && tag.id && tag.name) {
        if (!selectedTags.find((t) => t.id === tag.id)) {
          setSelectedTags([...selectedTags, tag]);
        }

        if (!availableTags.find((t) => t.id === tag.id)) {
          setAvailableTags([...availableTags, tag]);
        }

        setNewTagName('');
        setShowTagSuggestions(false);
      } else {
        toast.error('Invalid tag data received');
      }
    } catch (error) {
      toast.error('Failed to add tag');
    }
  };

  const handleAddStyle = async () => {
    if (!newStyleName.trim()) return;

    const exactMatch = styleSuggestions.find(
      (style) => style.name.toLowerCase() === newStyleName.toLowerCase()
    );

    if (exactMatch) {
      selectStyleFromSuggestion(exactMatch);
      return;
    }

    try {
      const response = await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStyleName.trim() }),
      });

      const data = await response.json();
      const style = data.style;

      if (style && style.id && style.name) {
        setSelectedStyle(style);

        if (!availableStyles.find((s) => s.id === style.id)) {
          setAvailableStyles([...availableStyles, style]);
        }

        setNewStyleName('');
        setShowStyleSuggestions(false);
      } else {
        toast.error('Invalid style data received');
      }
    } catch (error) {
      toast.error('Failed to add style');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to upload');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select an image to upload');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

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

      const createResponse = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title,
          description,
          promptTags: promptTags.trim() || undefined,
          contentRating,
          imageUrl: processedImage.imageUrl,
          thumbnailUrl: processedImage.thumbnailUrl,
          filename: processedImage.filename,
          thumbnailFilename: processedImage.thumbnailFilename,
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          tagIds: selectedTags.map((t) => t.id),
          styleIds: selectedStyle ? [selectedStyle.id] : [],
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create image record');
      }

      const data = await createResponse.json();
      toast.success('Image uploaded successfully!');
      router.push(`/image/${data.image.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
            <CardDescription>Share your artwork with the community</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Image File *</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded"
                      />
                      <p className="text-sm text-muted-foreground">
                        {selectedFile?.name}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setPreviewUrl('');
                        }}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WebP or GIF (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentRating">Content Rating</Label>
                <Select value={contentRating} onValueChange={setContentRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">Safe</SelectItem>
                    <SelectItem value="questionable">Questionable</SelectItem>
                    <SelectItem value="NSFW">NSFW</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Please rate your content appropriately.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promptTags">Simple Tags</Label>
                <Input
                  id="promptTags"
                  type="text"
                  value={promptTags}
                  onChange={(e) => setPromptTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
                <p className="text-xs text-muted-foreground">
                  Enter tags separated by commas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      ref={tagInputRef}
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onFocus={() => newTagName && setShowTagSuggestions(tagSuggestions.length > 0)}
                      onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                      placeholder="Add a tag..."
                    />
                    <Button type="button" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                  
                  {showTagSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {tagSuggestions.map((tag, index) => (
                        <div
                          key={tag.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-accent ${
                            index === selectedTagIndex ? 'bg-accent' : ''
                          }`}
                          onClick={() => selectTagFromSuggestion(tag)}
                        >
                          {tag.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1">
                      {tag.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setSelectedTags(selectedTags.filter((t) => t.id !== tag.id))
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Style (Only one allowed)</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      ref={styleInputRef}
                      type="text"
                      value={newStyleName}
                      onChange={(e) => setNewStyleName(e.target.value)}
                      onKeyDown={handleStyleKeyDown}
                      onFocus={() => newStyleName && setShowStyleSuggestions(styleSuggestions.length > 0)}
                      onBlur={() => setTimeout(() => setShowStyleSuggestions(false), 200)}
                      placeholder="Add a style..."
                    />
                    <Button type="button" onClick={handleAddStyle}>
                      {selectedStyle ? 'Replace' : 'Add'}
                    </Button>
                  </div>
                  
                  {showStyleSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {styleSuggestions.map((style, index) => (
                        <div
                          key={style.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-accent ${
                            index === selectedStyleIndex ? 'bg-accent' : ''
                          }`}
                          onClick={() => selectStyleFromSuggestion(style)}
                        >
                          {style.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedStyle && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedStyle.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedStyle(null)}
                      />
                    </Badge>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isUploading || !selectedFile}>
                <UploadIcon className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}