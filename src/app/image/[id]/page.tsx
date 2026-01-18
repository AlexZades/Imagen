"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Heart, ThumbsDown, Eye, User as UserIcon, Calendar, Maximize2, Palette, Edit, Trash2, Save } from 'lucide-react';

interface Image {
  id: string;
  userId: string;
  title: string;
  description?: string;
  promptTags?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
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
  const imageId = params?.id as string | undefined;
  
  const [image, setImage] = useState<Image | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [imageUser, setImageUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLikeStatus, setUserLikeStatus] = useState<boolean | null>(null);
  const [similarImages, setSimilarImages] = useState<Image[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPromptTags, setEditPromptTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (imageId) {
      fetchImage();
      if (user) {
        fetchLikeStatus();
      }
    }
  }, [imageId, user]);

  useEffect(() => {
    if (imageId && image) {
      fetchSimilarImages();
    }
  }, [imageId, image]);

  const fetchImage = async () => {
    if (!imageId) return;
    
    try {
      const response = await fetch(`/api/images/${imageId}`);
      if (!response.ok) {
        throw new Error('Image not found');
      }
      const data = await response.json();
      setImage(data.image);
      setTags(data.tags);
      setStyles(data.styles);
      setImageUser(data.user);
    } catch (error) {
      toast.error('Failed to load image');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSimilarImages = async () => {
    if (!imageId) return;
    
    setLoadingSimilar(true);
    try {
      const response = await fetch(`/api/images/${imageId}/similar?limit=6`);
      if (response.ok) {
        const data = await response.json();
        setSimilarImages(data.images);
      }
    } catch (error) {
      console.error('Error fetching similar images:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const fetchLikeStatus = async () => {
    if (!user || !imageId) return;

    try {
      const response = await fetch(`/api/likes?userId=${user.id}&imageId=${imageId}`);
      const data = await response.json();
      setUserLikeStatus(data.hasLiked);
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const handleLike = async (isLike: boolean) => {
    if (!user) {
      toast.error('Please login to like images');
      router.push('/login');
      return;
    }

    if (!imageId) return;

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          imageId: imageId,
          isLike,
        }),
      });

      const data = await response.json();

      if (image) {
        setImage({
          ...image,
          likeCount: data.likeCount,
          dislikeCount: data.dislikeCount,
        });
      }

      // Update user like status
      if (userLikeStatus === isLike) {
        setUserLikeStatus(null);
      } else {
        setUserLikeStatus(isLike);
      }
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const openEditDialog = () => {
    if (image) {
      setEditTitle(image.title);
      setEditDescription(image.description || '');
      setEditPromptTags(image.promptTags || '');
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!user || !image || !imageId) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: editTitle,
          description: editDescription,
          promptTags: editPromptTags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update image');
      }

      const data = await response.json();
      setImage(data.image);
      setIsEditDialogOpen(false);
      toast.success('Image updated successfully');
      
      // Refresh similar images after edit
      fetchSimilarImages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !image || !imageId) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/images/${imageId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete image');
      }

      toast.success('Image deleted successfully');
      router.push(`/user/${user.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete image');
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
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

  // Parse simple tags from comma-delimited string
  const simpleTags = image.promptTags
    ? image.promptTags.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
    : [];

  const isOwner = user && user.id === image.userId;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <img
                src={image.imageUrl}
                alt={image.title}
                className="w-full h-auto"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            </Card>

            <div className="mt-4 flex items-center gap-4">
              <Button
                variant={userLikeStatus === true ? 'default' : 'outline'}
                onClick={() => handleLike(true)}
                className="gap-2"
              >
                <Heart className={`w-4 h-4 ${userLikeStatus === true ? 'fill-current' : ''}`} />
                {image.likeCount}
              </Button>

              <Button
                variant={userLikeStatus === false ? 'default' : 'outline'}
                onClick={() => handleLike(false)}
                className="gap-2"
              >
                <ThumbsDown className={`w-4 h-4 ${userLikeStatus === false ? 'fill-current' : ''}`} />
                {image.dislikeCount}
              </Button>

              <div className="flex items-center gap-2 text-muted-foreground ml-auto">
                <Eye className="w-4 h-4" />
                {image.viewCount} views
              </div>

              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openEditDialog}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{image.title}</h1>
              {image.description && (
                <p className="text-muted-foreground">{image.description}</p>
              )}
            </div>

            <Separator />

            {imageUser && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  User
                </h3>
                <Link href={`/user/${imageUser.id}`} className="hover:underline">
                  {imageUser.username}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Calendar className="w-3 h-3" />
                  <span className="text-xs">Posted</span>
                </div>
                <p className="font-medium">
                  {new Date(image.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Maximize2 className="w-3 h-3" />
                  <span className="text-xs">Size</span>
                </div>
                <p className="font-medium">
                  {image.width} × {image.height}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Palette className="w-3 h-3" />
                  <span className="text-xs">Style</span>
                </div>
                {styles.length > 0 ? (
                  <Link href={`/search?style=${styles[0].id}`}>
                    <p className="font-medium hover:underline cursor-pointer truncate">
                      {styles[0].name}
                    </p>
                  </Link>
                ) : (
                  <p className="text-muted-foreground">None</p>
                )}
              </div>
            </div>

            {simpleTags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Simple Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {simpleTags.map((tag, index) => (
                    <Link key={index} href={`/search?simpleTag=${encodeURIComponent(tag)}`}>
                      <Badge variant="default" className="cursor-pointer hover:bg-primary/80">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link key={tag.id} href={`/search?tag=${tag.id}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        {tag.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Images Section */}
        {similarImages.length > 0 && (
          <div className="mt-12">
            <Separator className="mb-6" />
            <h2 className="text-2xl font-bold mb-6">Similar Images</h2>
            
            {loadingSimilar ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Loading similar images...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {similarImages.map((similarImage) => (
                  <Link key={similarImage.id} href={`/image/${similarImage.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        <img
                          src={similarImage.thumbnailUrl || similarImage.imageUrl}
                          alt={similarImage.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm truncate mb-1">
                          {similarImage.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {similarImage.likeCount}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {similarImage.viewCount}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>
              Update the title, description, and tags for this image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editTitle" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter title..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="editDescription" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="editPromptTags" className="text-sm font-medium">
                Simple Tags
              </label>
              <Input
                id="editPromptTags"
                value={editPromptTags}
                onChange={(e) => setEditPromptTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-muted-foreground">
                Enter tags separated by commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your image
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}