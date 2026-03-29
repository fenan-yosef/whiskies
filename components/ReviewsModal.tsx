"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReviewRecord {
  id: number;
  product_id: number;
  reviewer: string | null;
  rating: number | null;
  rating_max: number | null;
  review_text: string | null;
  review_date: string | null;
  helpful_votes: number | null;
  is_verified_purchase: number | null;
  source: string | null;
  scraped_at: string | null;
}

interface Props {
  productId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReviewsModal({ productId, open, onOpenChange }: Props) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || productId === null) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/wine-reviews?product_id=${productId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load reviews');
        if (mounted) {
          const list: ReviewRecord[] = (json.data || []).map((r: any) => ({
            id: r.id,
            product_id: r.product_id,
            reviewer: r.reviewer ?? null,
            rating: r.rating != null ? Number(r.rating) : null,
            rating_max: r.rating_max != null ? Number(r.rating_max) : null,
            review_text: r.review_text ?? null,
            review_date: r.review_date ?? null,
            helpful_votes: r.helpful_votes != null ? Number(r.helpful_votes) : null,
            is_verified_purchase: r.is_verified_purchase != null ? Number(r.is_verified_purchase) : 0,
            source: r.source ?? null,
            scraped_at: r.scraped_at ?? null,
          }));
          setReviews(list);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load reviews');
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
          <DialogTitle>Reviews</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500 animate-pulse">Loading reviews...</div>
          ) : (
            (() => {
              if (!reviews || reviews.length === 0) {
                return <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-zinc-500">No reviews available for this product.</p>
                </div>;
              }

              return (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-white">{r.reviewer || 'Anonymous'}</div>
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">{r.review_date || r.scraped_at || ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">Rating: {r.rating != null ? `${r.rating}${r.rating_max ? `/${r.rating_max}` : '/5'}` : 'N/A'}</div>
                          {r.is_verified_purchase ? <div className="mt-1 text-xs inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded">Verified</div> : null}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{r.review_text || ''}</p>
                      <div className="mt-3 text-xs text-zinc-500">Source: {r.source || 'unknown'} • Helpful: {r.helpful_votes ?? 0}</div>
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
