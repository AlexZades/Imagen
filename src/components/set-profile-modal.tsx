"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface SetProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  userId: string;
  onSuccess: (newAvatarUrl: string) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: 'px',
        width: 256,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function SetProfileModal({ isOpen, onClose, imageUrl, userId, onSuccess }: SetProfileModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [isSaving, setIsSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use proxy for images to avoid CORS issues when drawing to canvas
  const displayUrl = imageUrl.startsWith('http') 
    ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  const getCroppedImg = async (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Set fixed size for profile picture (e.g. 256x256) or use crop size
    // Using crop size but scaled to natural dimensions ensures quality
    const pixelRatio = window.devicePixelRatio;
    
    // We want a square output, ideally at least 256x256
    // But we should probably just save the crop at full resolution
    // and let the client/server handle resizing if needed.
    // However, the prompt asked to "crop the image down to a 256x256 square (or a larger square)"
    // Let's keep it simple and output the cropped area at natural resolution.
    
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    
    // Check if we need to resize (e.g. if too small, or strictly 256)
    // For now, let's stick to natural resolution of the crop.
    // To implement "down to 256x256", we could set canvas.width = 256; canvas.height = 256;
    // and draw the image scaled.
    
    // Let's do 256x256 as a target if the user wants "profile picture" usually small is fine.
    // But larger is better for quality. Let's aim for 512x512 max or natural if smaller.
    // Actually, prompt says "down to a 256x256 square (or a larger square)".
    // So preserving resolution is best.
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';
    
    // We need to account for the scale when drawing
    // But wait, if we set canvas.width/height based on natural dimensions,
    // we don't need to scale the context if we draw properly.
    
    // Let's reset and do it the standard way
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    
    const ctx2 = canvas.getContext('2d');
    if (!ctx2) throw new Error('No 2d context');

    ctx2.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.95 // quality
      );
    });
  };

  const handleSave = async () => {
    if (!imgRef.current || !crop) return;

    setIsSaving(true);
    try {
      const blob = await getCroppedImg(imgRef.current, crop);
      
      // Upload
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');
      formData.append('userId', userId);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update profile picture');
      }

      const data = await response.json();
      toast.success('Profile picture updated!');
      onSuccess(data.avatarUrl);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile picture');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Set Profile Picture</DialogTitle>
          <DialogDescription>
            Crop the image to set it as your profile picture.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center items-center py-4 bg-muted/20 rounded-lg overflow-hidden max-h-[60vh]">
            {/* ReactCrop handles the UI */}
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCrop(c)}
              aspect={1}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={displayUrl}
                onLoad={onImageLoad}
                style={{ maxHeight: '50vh', maxWidth: '100%', objectFit: 'contain' }}
                crossOrigin="anonymous" // Important for canvas taint issues if on different domain
              />
            </ReactCrop>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !crop}>
            {isSaving ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile Picture
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}