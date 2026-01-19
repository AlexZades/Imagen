"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Eye, Clock } from 'lucide-react';

interface Image {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  likeCount: number;
  viewCount: number;
  createdAt: string;
}

export default function NewestPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images?limit=50&sort=new');
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ImageCard = ({ image }: { image: Image }) => {
    return (
      <Link href={`/image/${image.id}`}>
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer h-full">
          <div className="relative bg-muted aspect-square">
            <img
              src={image.thumbnailUrl || image.imageUrl}
              alt={image.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </div>
          <CardContent className="p-3">
            <h3 className="font-medium truncate mb-2 text-base">
              {image.title}
            </h3>
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
    );
  };

  const LoadingSkeleton = () => {
    return (
      <Card className="overflow-hidden h-full">
        <div className="bg-muted animate-pulse aspect-square" />
        <CardContent className="p-3">
          <div className="bg-muted animate-pulse rounded h-5 mb-2" />
          <div className="flex gap-3">
            <div className="bg-muted animate-pulse rounded h-4 w-12" />
            <div className="bg-muted animate-pulse rounded h-4 w-12" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Newest Images</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(24)].map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-lg">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No images uploaded yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Be the first to share something!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}