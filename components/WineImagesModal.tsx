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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WineImagesModal({ productId, open, onOpenChange }: Props) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || productId === null) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/wine-images?product_id=${productId}`);
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
            <div className="text-center py-8">Loading images...</div>
          ) : images
              .map((img) => img.url || img.data_url || img.file_path || null)
              .filter(Boolean).length === 0 ? (
            <div className="text-center py-8">No images available for this item.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images
                .map((img) => {
                  const src = img.url || img.data_url || img.file_path || null;
                  return src ? { ...img, src } : null;
                })
                .filter(Boolean)
                .map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img!.id} src={img!.src} alt={`image-${img!.id}`} className="w-full h-64 object-contain bg-zinc-100" />
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
