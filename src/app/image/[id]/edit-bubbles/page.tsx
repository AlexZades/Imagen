"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, RefreshCw, MessageSquare, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Image {
  id: string;
  userId: string;
  title: string;
  imageUrl: string;
  width: number;
  height: number;
}

type EditorState = 'loading_image' | 'identifying' | 'editing' | 'processing' | 'review' | 'saving';

export default function EditBubblesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const imageId = params?.id as string | undefined;

  const [state, setState] = useState<EditorState>('loading_image');
  const [image, setImage] = useState<Image | null>(null);
  
  // These would come from the API
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [bubbleCount, setBubbleCount] = useState<number>(0);
  
  // User inputs
  const [bubbleTexts, setBubbleTexts] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (imageId) {
      fetchImage();
    }
  }, [imageId, user, router]);

  const fetchImage = async () => {
    try {
      const response = await fetch(`/api/images/${imageId}`);
      if (!response.ok) throw new Error('Image not found');
      const data = await response.json();
      setImage(data.image);
      
      // Once image is loaded, start identifying bubbles
      startIdentification(data.image.imageUrl);
    } catch (error) {
      toast.error('Failed to load image');
      router.push('/');
    }
  };

  const startIdentification = async (imageUrl: string) => {
    setState('identifying');
    
    // MOCK API CALL: Identify bubbles
    // In the future: const res = await fetch('/api/bubbles/identify', { ... })
    setTimeout(() => {
      // Mock response
      setAnnotatedImageUrl(imageUrl); // In reality this would be the image with numbers drawn on it
      const mockCount = 3;
      setBubbleCount(mockCount);
      setBubbleTexts(new Array(mockCount).fill(''));
      setState('editing');
      toast.success(`Identified ${mockCount} speech bubbles`);
    }, 2000);
  };

  const handleGenerate = async () => {
    if (bubbleTexts.every(t => !t.trim())) {
      toast.error("Please enter text for at least one speech bubble");
      return;
    }

    setState('processing');

    // MOCK API CALL: Replace text
    // In the future: const res = await fetch('/api/bubbles/replace', { ... })
    setTimeout(() => {
      // Mock response: normally this would be the modified image URL
      if (image) {
        setFinalImageUrl(image.imageUrl);
      }
      setState('review');
    }, 2000);
  };

  const handleSave = async () => {
    if (!finalImageUrl || !imageId) return;
    
    setState('saving');
    
    try {
      // MOCK API CALL: Overwrite original image
      // This would normally involve uploading the temp 'finalImageUrl' to replace the main image record
      // const res = await fetch(`/api/images/${imageId}/overwrite`, { method: 'POST', body: ... })
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Image updated successfully!");
      router.push(`/image/${imageId}`);
    } catch (error) {
      toast.error("Failed to save image");
      setState('review');
    }
  };

  const handleReEdit = () => {
    setState('editing');
  };

  const handleCancel = () => {
    router.back();
  };

  if (state === 'loading_image') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Edit Speech Bubbles
          </h1>
        </div>

        {/* LOADING STATES */}
        {(state === 'identifying' || state === 'processing' || state === 'saving') && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-16 h-16 animate-spin text-primary relative z-10" />
            </div>
            <h2 className="text-xl font-semibold mt-6">
              {state === 'identifying' && "Identifying speech bubbles..."}
              {state === 'processing' && "Replacing text..."}
              {state === 'saving' && "Saving changes..."}
            </h2>
            <p className="text-muted-foreground mt-2">This may take a few moments</p>
          </div>
        )}

        {/* EDITING STATE */}
        {state === 'editing' && annotatedImageUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Identified Bubbles</CardTitle>
                  <CardDescription>
                    Reference the numbered bubbles in the image to enter your text below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bubbleTexts.map((text, index) => (
                    <div key={index} className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">
                          {index + 1}
                        </span>
                        Bubble #{index + 1}
                      </label>
                      <Textarea
                        value={text}
                        onChange={(e) => {
                          const newTexts = [...bubbleTexts];
                          newTexts[index] = e.target.value;
                          setBubbleTexts(newTexts);
                        }}
                        placeholder={`Enter text for bubble #${index + 1}...`}
                        rows={2}
                      />
                    </div>
                  ))}

                  <Button onClick={handleGenerate} className="w-full mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Preview Changes
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:sticky lg:top-8 h-fit">
              <Card className="overflow-hidden">
                <div className="bg-muted aspect-auto flex items-center justify-center min-h-[400px]">
                  <img 
                    src={annotatedImageUrl} 
                    alt="Annotated" 
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </Card>
              <p className="text-sm text-muted-foreground text-center mt-2">
                * Numbers indicate detected speech bubbles
              </p>
            </div>
          </div>
        )}

        {/* REVIEW STATE */}
        {state === 'review' && finalImageUrl && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Review Changes</CardTitle>
                <CardDescription>
                  Check if the text fits correctly. Saving will overwrite the original image.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                  <img 
                    src={finalImageUrl} 
                    alt="Final Result" 
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" size="lg" onClick={handleReEdit} className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editing
              </Button>
              <Button size="lg" onClick={handleSave} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save & Overwrite
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}