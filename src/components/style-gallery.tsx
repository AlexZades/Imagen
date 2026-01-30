import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ImageIcon } from 'lucide-react';

interface Style {
  id: string;
  name: string;
  description?: string;
  checkpointName?: string;
  demoImageThumbnailUrl?: string;
  demoImageUrl?: string;
}

interface StyleGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  styles: Style[];
  onSelect: (styleId: string) => void;
  selectedStyleId?: string;
}

export function StyleGallery({ isOpen, onClose, styles, onSelect, selectedStyleId }: StyleGalleryProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Style Gallery</DialogTitle>
          <DialogDescription>
            Browse and select a style for your generation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {styles.map((style) => (
              <div
                key={style.id}
                className={cn(
                  "cursor-pointer group relative flex flex-col overflow-hidden rounded-lg border bg-background transition-all hover:border-primary hover:shadow-md",
                  selectedStyleId === style.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-muted"
                )}
                onClick={() => {
                  onSelect(style.id);
                  onClose();
                }}
              >
                <div className="aspect-square relative bg-muted overflow-hidden">
                  {style.demoImageThumbnailUrl ? (
                    <img 
                      src={style.demoImageThumbnailUrl} 
                      alt={style.name} 
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 opacity-50" />
                    </div>
                  )}
                  {selectedStyleId === style.id && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="bg-primary text-primary-foreground">Selected</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate" title={style.name}>{style.name}</h3>
                  {style.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1" title={style.description}>
                      {style.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}