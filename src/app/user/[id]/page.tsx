"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Heart, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  avatarUrl?: string;
}

interface Image {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  likeCount: number;
  viewCount: number;
}

const IMAGES_PER_PAGE = 20;

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.id as string | undefined;
  
  const [user, setUser] = useState<User | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Image[]>([]);
  const [likedImages, setLikedImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'uploaded' | 'liked'>('uploaded');
  
  // Pagination state
  const [uploadedPage, setUploadedPage] = useState(1);
  const [likedPage, setLikedPage] = useState(1);
  const [uploadedTotal, setUploadedTotal] = useState(0);
  const [likedTotal, setLikedTotal] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUploadedImages();
    }
  }, [userId, uploadedPage]);

  useEffect(() => {
    if (userId && activeTab === 'liked') {
      fetchLikedImages();
    }
  }, [userId, likedPage, activeTab]);

  const fetchUser = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const fetchUploadedImages = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const offset = (uploadedPage - 1) * IMAGES_PER_PAGE;
      const response = await fetch(
        `/api/images?userId=${userId}&limit=${IMAGES_PER_PAGE}&offset=${offset}`
      );

      if (response.ok) {
        const data = await response.json();
        setUploadedImages(data.images);
        setUploadedTotal(data.total);
      }
    } catch (error) {
      toast.error('Failed to load uploaded images');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLikedImages = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const offset = (likedPage - 1) * IMAGES_PER_PAGE;
      const response = await fetch(
        `/api/users/${userId}/liked-images?limit=${IMAGES_PER_PAGE}&offset=${offset}`
      );

      if (response.ok) {
        const data = await response.json();
        setLikedImages(data.images);
        setLikedTotal(data.total);
      }
    } catch (error) {
      toast.error('Failed to load liked images');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPagination = (currentPage: number, totalItems: number, onPageChange: (page: number) => void) => {
    const totalPages = Math.ceil(totalItems / IMAGES_PER_PAGE);
    
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (pages[pages.length - 1] !== i - 1 && i > 2) {
        pages.push('ellipsis');
      }
      pages.push(i);
    }
    
    // Always show last page
    if (totalPages > 1) {
      if (pages[pages.length - 1] !== totalPages - 1 && totalPages > 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }

    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          {pages.map((page, index) => (
            <PaginationItem key={index}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(page);
                  }}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderImageGrid = (images: Image[]) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse" />
            </Card>
          ))}
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {activeTab === 'uploaded' ? 'No images uploaded yet' : 'No liked images yet'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <Link key={image.id} href={`/image/${image.id}`} >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="aspect-square relative bg-muted">
                <img
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium truncate mb-2">{image.title}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {image.likeCount}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {image.viewCount}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-24 h-24 rounded-2xl">
              {user?.avatarUrl && (
                <AvatarImage 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  className="object-cover"
                />
              )}
              <AvatarFallback className="text-3xl rounded-2xl">
                {user?.username ? user.username[0].toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{user?.username || 'Loading...'}</h1>
              <p className="text-muted-foreground">
                {uploadedTotal} {uploadedTotal === 1 ? 'image' : 'images'} uploaded
                {likedTotal > 0 && ` • ${likedTotal} ${likedTotal === 1 ? 'image' : 'images'} liked`}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'uploaded' | 'liked')} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="uploaded">Uploaded ({uploadedTotal})</TabsTrigger>
            <TabsTrigger value="liked">Liked ({likedTotal})</TabsTrigger>
          </TabsList>

          <TabsContent value="uploaded">
            {renderImageGrid(uploadedImages)}
            {renderPagination(uploadedPage, uploadedTotal, setUploadedPage)}
          </TabsContent>

          <TabsContent value="liked">
            {renderImageGrid(likedImages)}
            {renderPagination(likedPage, likedTotal, setLikedPage)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}