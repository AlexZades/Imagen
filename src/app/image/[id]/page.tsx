"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Heart, Eye, MessageSquare, Download, Trash2, Edit, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCredits } from '@/contexts/credits-context';

interface Image {
  id: string;
  userId: string;
  title: string;
  description?: string;
  promptTags?: string;
  maleCharacterTags?: string;
  femaleCharacterTags?: string;
  otherCharacterTags?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  size: number;
  likeCount: number;
  viewCount: number;
  createdAt: string;
  contentRating: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Style {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  avatarUrl?: string;
}

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { creditsEnabled, refreshCredits } = useCredits();
  const imageId = params?.id as string | undefined;

  const [image, setImage] = useState<Image | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [imageUser, setImageUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasLiked, setHasLiked] = useState<boolean | null>(null);
  const [showEditBubbles, setShowEditBubbles] = useState(false);
  const [speechBubbleTriggers, setSpeechBubbleTriggers] = useState<string[]>([]);

  useEffect(() => {
    if (imageId) {
      fetchImage();
      fetchSpeechBubbleTriggers();
    }
  }, [imageId]);

  useEffect(() => {
    if (user && imageId) {
      fetchLikeStatus();
    }
  }, [user, imageId]);

  const fetchImage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/images/${imageId}`);
      if (!response.ok) throw new Error('Image not found');
      const data = await response.json();
      setImage(data.image);
      setTags(data.tags || []);
      setStyles(data.styles || []);
      setImageUser(data.user || null);
    } catch (error) {
      toast.error('Failed to load image');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLikeStatus = async () => {
    if (!user || !imageId) return;
    try {
      const response = await fetch(`/api/likes?userId=${user.id}&imageId=${imageId}`);
      const data = await response.json();
      setHasLiked(data.hasLiked);
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const fetchSpeechBubbleTriggers = async () => {
    try {
      const response = await fetch('/api/generation-config?key=speech_bubble_triggers');
      const data = await response.json();
      if (data.value) {
        const triggers = data.value.split(',').map((t: string) => t.trim().toLowerCase());
        setSpeechBubbleTriggers(triggers);
      }
    } catch (error) {
      console.error('Error fetching speech bubble triggers:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('You must be logged in to like images');
      return;
    }

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          imageId: imageId,
          isLike: !hasLiked,
        }),
      });

      const data = await response.json();
      setHasLiked(data.hasLiked === null ? false : data.hasLiked);
      
      if (image) {
        setImage({
          ...image,
          likeCount: data.likeCount,
        });
      }

      if (creditsEnabled) {
        refreshCredits();
      }
    } catch (error) {
      toast.error('Failed to update like status');
    }
  };

  const handleDelete = async () => {
    if (!user || !imageId) return;

    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/images/${imageId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      toast.success('Image deleted successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!image) return;

    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.title}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const getAspectRatioKey = (width: number, height: number): string => {
    const ratio = width / height;
    if (ratio >= 1.6) return '4'; // Wide Landscape
    if (ratio >= 1.2) return '3'; // Landscape
    if (ratio <= 0.8) return '2'; // Portrait
    return '1'; // Square
  };

  const handleRemix = () => {
    if (!image) return;
    
    const params = new URLSearchParams();
    if (image.promptTags) params.set('promptTags', image.promptTags);
    if (styles.length > 0) params.set('styleId', styles[0].id);
    if (tags.length > 0) params.set('tagIds', tags.map(t => t.id).join(','));
    params.set('aspect', getAspectRatioKey(image.width, image.height));
    
    // Add character tags to the remix parameters
    if (image.maleCharacterTags) params.set('maleTags', image.maleCharacterTags);
    if (image.femaleCharacterTags) params.set('femaleTags', image.femaleCharacterTags);
    if (image.otherCharacterTags) params.set('otherTags', image.otherCharacterTags);
    
    router.push(`/create?${params.toString()}`);
  };

  const shouldShowEditBubbles = () => {
    if (!image?.promptTags) return false;
    const lowerTags = image.promptTags.toLowerCase();
    return speechBubbleTriggers.some(trigger => lowerTags.includes(trigger));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!image) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Display */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative bg-muted flex items-center justify-center min-h-[400px]">
                <img
                  src={image.imageUrl}
                  alt={image.title}
                  className="max-w-full h-auto object-contain"
                />
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={hasLiked ? 'default' : 'outline'}
                onClick={handleLike}
                disabled={!user}
              >
                <Heart className={`w-4 h-4 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                {image.likeCount}
              </Button>

              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>

              <Button variant="outline" onClick={handleRemix}>
                <Wand2 className="w-4 h-4 mr-2" />
                Remix
              </Button>

              {shouldShowEditBubbles() && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/image/${imageId}/edit-bubbles`)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Edit Bubbles
                </Button>
              )}

              {user?.id === image.userId && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/image/${imageId}/edit`)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Image Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{image.title}</h1>
              <p className="text-muted-foreground">
                By {imageUser?.username || 'Unknown'}
              </p>
            </div>

            {image.description && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm">{image.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="flex gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                {image.likeCount} likes
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {image.viewCount} views
              </div>
              <div className="flex items-center gap-2">
                {image.width} × {image.height}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Styles */}
            {styles.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Styles</h3>
                <div className="flex flex-wrap gap-2">
                  {styles.map((style) => (
                    <Badge key={style.id} variant="outline">
                      {style.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Simple Tags */}
            {image.promptTags && (
              <div className="space-y-2">
                <h3 className="font-semibold">Simple Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {image.promptTags.split(',').map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Character Tags */}
            {(image.maleCharacterTags || image.femaleCharacterTags || image.otherCharacterTags) && (
              <div className="space-y-2">
                <h3 className="font-semibold">Characters</h3>
                <div className="space-y-2">
                  {image.maleCharacterTags && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                        Male: {image.maleCharacterTags}
                      </Badge>
                    </div>
                  )}
                  {image.femaleCharacterTags && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200">
                        Female: {image.femaleCharacterTags}
                      </Badge>
                    </div>
                  )}
                  {image.otherCharacterTags && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200">
                        Other: {image.otherCharacterTags}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Rating */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Content Rating:</span>
              <Badge variant={image.contentRating === 'NSFW' ? 'destructive' : 'secondary'}>
                {image.contentRating}
              </Badge>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}