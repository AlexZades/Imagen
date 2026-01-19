"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Image {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  likeCount: number;
  viewCount: number;
  createdAt: string;
}

const IMAGES_PER_PAGE = 50;

export default function NewestPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);

  useEffect(() => {
    fetchImages();
  }, [currentPage]);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * IMAGES_PER_PAGE;
      const response = await fetch(`/api/images?limit=${IMAGES_PER_PAGE}&offset=${offset}&sort=new`);
      const data = await response.json();
      setImages(data.images || []);
      setTotalImages(data.total || 0);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Newest Images</h1>
          </div>
          
          {!isLoading && totalImages > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * IMAGES_PER_PAGE) + 1}-{Math.min(currentPage * IMAGES_PER_PAGE, totalImages)} of {totalImages} images
            </p>
          )}
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {images.map((image) => (
                <ImageCard key={image.id} image={image} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      <React.Fragment key={index}>
                        {page === '...' ? (
                          <span className="px-3 py-2 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageClick(page as number)}
                            className="min-w-[40px]"
                          >
                            {page}
                          </Button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}