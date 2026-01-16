"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, Search, Tag as TagIcon, Palette } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';

interface Image {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  likeCount: number;
  viewCount: number;
  createdAt: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Style {
  id: string;
  name: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const tagId = searchParams.get('tag');
  const styleId = searchParams.get('style');
  const simpleTag = searchParams.get('simpleTag');

  const [images, setImages] = useState<Image[]>([]);
  const [tagInfo, setTagInfo] = useState<Tag | null>(null);
  const [styleInfo, setStyleInfo] = useState<Style | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchImages();
    if (tagId) fetchTagInfo();
    if (styleId) fetchStyleInfo();
  }, [tagId, styleId, simpleTag]);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      let url = '/api/images?limit=25';
      
      if (tagId) {
        url += `&tagId=${tagId}`;
      } else if (styleId) {
        url += `&styleId=${styleId}`;
      } else if (simpleTag) {
        url += `&simpleTag=${encodeURIComponent(simpleTag)}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTagInfo = async () => {
    if (!tagId) return;
    try {
      const response = await fetch(`/api/tags/${tagId}`);
      const data = await response.json();
      setTagInfo(data.tag);
    } catch (error) {
      console.error('Error fetching tag info:', error);
    }
  };

  const fetchStyleInfo = async () => {
    if (!styleId) return;
    try {
      const response = await fetch(`/api/styles/${styleId}`);
      const data = await response.json();
      setStyleInfo(data.style);
    } catch (error) {
      console.error('Error fetching style info:', error);
    }
  };

  const getSearchTitle = () => {
    if (tagInfo) return tagInfo.name;
    if (styleInfo) return styleInfo.name;
    if (simpleTag) return simpleTag;
    return 'Search Results';
  };

  const getSearchIcon = () => {
    if (tagId) return <TagIcon className="w-6 h-6 text-primary" />;
    if (styleId) return <Palette className="w-6 h-6 text-primary" />;
    return <Search className="w-6 h-6 text-primary" />;
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {getSearchIcon()}
            <h1 className="text-3xl font-bold">{getSearchTitle()}</h1>
          </div>
          <p className="text-muted-foreground">
            {isLoading ? 'Loading...' : `${images.length} image${images.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No images found with this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        )}
      </main>

      <MadeWithDyad />
    </div>
  );
}