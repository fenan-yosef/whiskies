'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageRecord {
  id: number;
  product_id: number;
  url: string | null;
  data_url?: string | null;
  file_path?: string | null;
  position: number;
}

interface Props {
  productId: number | null;
  mainImage?: string | null;
  otherImages?: string | string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WhiskyImagesModal({ productId, mainImage, otherImages, open, onOpenChange }: Props) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || productId === null) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/whisky-images?product_id=${productId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load images');
        if (mounted) {
          const list: ImageRecord[] = (json.data || []).map((i: any) => ({
            id: i.id,
            product_id: i.product_id,
            url: i.url ?? null,
            data_url: i.data_url ?? null,
            file_path: i.file_path ?? null,
            position: i.position ?? 0,
          }));

          setImages(list);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load images');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, productId]);

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Images</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500 animate-pulse">Loading all images...</div>
          ) : (
            (() => {
              // Collect all potential image sources
              const sources = new Set<string>();
              
              // 1. Main image from product table
              if (mainImage) sources.add(mainImage);
              
              // 2. Secondary images from all_images field (JSON array or string)
              if (otherImages) {
                try {
                  const parsed = typeof otherImages === 'string' ? JSON.parse(otherImages) : otherImages;
                  if (Array.isArray(parsed)) {
                    parsed.forEach(img => { if (img) sources.add(img); });
                  } else if (typeof parsed === 'string') {
                    sources.add(parsed);
                  }
                } catch (e) {
                  // If it's not JSON, maybe it's a comma-separated list?
                  if (typeof otherImages === 'string') {
                     otherImages.split(',').forEach(s => { if (s.trim()) sources.add(s.trim()); });
                  }
                }
              }

              // 3. Images from independent images table
              images.forEach(img => {
                const src = img.url || img.data_url || img.file_path;
                if (src) sources.add(src);
              });

              const validImages = Array.from(sources).filter(Boolean);

              if (validImages.length === 0) {
                return <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-zinc-500">No images available for this item.</p>
                </div>;
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {validImages.map((src, idx) => (
                    <div key={idx} className="group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-all duration-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`image-${idx}`}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md text-[10px] text-white rounded-full font-bold uppercase tracking-tighter">
                        {src === mainImage ? 'Main Image' : `Gallery ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
