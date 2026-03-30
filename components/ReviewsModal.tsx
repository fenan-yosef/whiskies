"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, MessageSquare, ThumbsUp, Calendar, ShoppingBag, ExternalLink } from 'lucide-react';
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
  productName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StarRating = ({ rating, max = 5 }: { rating: number; max?: number }) => {
  const normalized = (rating / max) * 5;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${
            s <= Math.round(normalized)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-800 dark:text-zinc-800'
          }`}
        />
      ))}
    </div>
  );
};

export default function ReviewsModal({ productId, productName, open, onOpenChange }: Props) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || productId === null) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/whisky-reviews?product_id=${productId}`);
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

  const stats = React.useMemo(() => {
    if (!reviews.length) return null;
    const avg = reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length;
    const verified = reviews.filter(r => r.is_verified_purchase).length;
    return { avg, verified };
  }, [reviews]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-2xl font-bold tracking-tight bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
              {productName || 'Product Reviews'}
            </DialogTitle>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              {stats && (
                <>
                  <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                    <StarRating rating={stats.avg} />
                    <span className="ml-1 leading-none">{stats.avg.toFixed(1)} Rating</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>{reviews.length} total reviews</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">No reviews yet</h3>
                  <p className="text-zinc-500 max-w-xs mx-auto">Be the first to share your thoughts on this product or check back later.</p>
                </div>
              </div>
            ) : (
              reviews.map((r, idx) => (
                <div 
                  key={r.id} 
                  className="group relative flex flex-col p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 hover:border-amber-500/30 hover:shadow-lg transition-all duration-300"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-400">
                        {(r.reviewer || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          {r.reviewer || 'Anonymous'}
                          {r.is_verified_purchase === 1 && (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-none text-[10px] font-bold px-1.5 py-0 uppercase">
                              <ShoppingBag className="w-2.5 h-2.5 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {r.review_date || (r.scraped_at ? new Date(r.scraped_at).toLocaleDateString() : 'N/A')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StarRating rating={r.rating ?? 0} max={r.rating_max ?? 5} />
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{r.source || 'Direct'}</span>
                    </div>
                  </div>

                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm italic relative">
                    <span className="text-4xl absolute -top-4 -left-2 text-zinc-100 dark:text-zinc-800 select-none font-serif opacity-50">"</span>
                    {r.review_text || 'No review content provided.'}
                  </p>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      <button className="flex items-center gap-1.5 text-zinc-500 hover:text-amber-600 transition-colors group/btn">
                        <ThumbsUp className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span className="font-medium">{r.helpful_votes ?? 0}</span>
                      </button>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-medium border-zinc-200 dark:border-zinc-800 text-zinc-400">
                      ID: {r.id}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-semibold px-8 text-zinc-600 dark:text-zinc-400">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

