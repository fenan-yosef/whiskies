'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FiGrid, FiList } from 'react-icons/fi';
import { Wine } from '@/lib/mockData';
import WineImagesModal from './WineImagesModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface WineTableProps {
  wines: Wine[];
  isLoading: boolean;
  onEdit: (wine: Wine) => void;
  onDelete: (id: number) => Promise<void>;
  // optional pagination props — if provided, pagination will be rendered
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function WineTable({ wines, isLoading, onEdit, onDelete, currentPage = 1, totalPages = 1, onPageChange, }: WineTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  // default display: newest (highest id) first
  const sortedWines = [...wines].sort((a, b) => b.id - a.id);
  const [imagesModalWine, setImagesModalWine] = useState<Wine | null>(null);
  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const getAccessor = (col: string) => {
    switch (col) {
      case 'id':
        return (w: any) => Number(w.id ?? 0);
      case 'price':
        return (w: any) => {
          const raw = w.price;
          if (typeof raw === 'number') return raw as number;
          if (typeof raw === 'string') {
            const n = parseFloat(raw.replace(/[^0-9.-]+/g, ''));
            return isNaN(n) ? Number.NEGATIVE_INFINITY : n;
          }
          return Number.NEGATIVE_INFINITY;
        };
      case 'name':
      case 'currency':
      case 'url':
      case 'abv':
      case 'volume':
        return (w: any) => String((w as any)[col] ?? '').toLowerCase();
      default:
        return (w: any) => '';
    }
  };

  const displayedWines = useMemo(() => {
    if (!sortBy) return sortedWines;
    const accessor = getAccessor(sortBy);
    const arr = [...sortedWines];
    arr.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va ?? '');
      const sb = String(vb ?? '');
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [sortedWines, sortBy, sortDir]);

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteId);
      toast.success('Wine deleted successfully');
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete wine');
    } finally {
      setIsDeleting(false);
    }
  };

  if (wines.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-zinc-500">No wines found. Try adjusting your search or add a new wine.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        {/* Top controls: view toggle and optional pagination */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')} className="h-8 w-8 p-0">
              <FiList className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} className="h-8 w-8 p-0">
              <FiGrid className="w-4 h-4" />
            </Button>
          </div>

          {onPageChange && totalPages && (
            <div className="hidden sm:block">
              {/* duplicated pagination at top when pagination props provided */}
              <div>
                {/* render a simple indicator and rely on parent to render controls if needed */}
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Page {currentPage} of {totalPages}</p>
              </div>
            </div>
          )}
        </div>
        {viewMode === 'table' ? (
          <Table>
          <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900">
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer" onClick={() => handleSort('id')}>ID {sortBy === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer" onClick={() => handleSort('name')}>Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer">Brand</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer" onClick={() => handleSort('price')}>Price {sortBy === 'price' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer" onClick={() => handleSort('currency')}>Currency {sortBy === 'currency' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer" onClick={() => handleSort('abv')}>ABV {sortBy === 'abv' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer" onClick={() => handleSort('volume')}>Volume {sortBy === 'volume' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white">Images</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white cursor-pointer" onClick={() => handleSort('url')}>URL {sortBy === 'url' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
              <TableHead className="text-right font-semibold text-zinc-900 dark:text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              displayedWines.map((wine) => {
                const rawPrice = wine.price;
                const parsed = typeof rawPrice === 'number' ? rawPrice : (typeof (rawPrice as any) === 'string' ? parseFloat((rawPrice as any).replace(/[^0-9.-]+/g, '')) : NaN);
                const priceDisplay = !isNaN(parsed) ? `$${parsed.toFixed(2)}` : (rawPrice ? String(rawPrice) : 'N/A');

                return (
                  <TableRow
                    key={wine.id}
                    className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <TableCell className="font-medium text-zinc-900 dark:text-white">{wine.id}</TableCell>
                    <TableCell className="font-medium text-zinc-900 dark:text-white">{wine.name}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{(wine as any).brand || '-'}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{priceDisplay}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{(wine as any).currency || 'N/A'}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{(wine as any).abv ?? 'N/A'}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{(wine as any).volume ?? 'N/A'}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => { setImagesModalWine(wine); setImagesModalOpen(true); }}>
                          View
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                      {wine.url ? <a href={wine.url} target="_blank" rel="noreferrer" className="text-amber-600">Link</a> : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Edit and Delete buttons removed */}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse bg-zinc-50 dark:bg-zinc-900" />
              ))
            ) : (
              displayedWines.map((w) => {
                const imgs: string[] = [];
                if (w.image_url) imgs.push(w.image_url);
                if (w.all_images) {
                  try {
                    const parsed = typeof w.all_images === 'string' ? JSON.parse(w.all_images) : w.all_images;
                    if (Array.isArray(parsed)) {
                      parsed.forEach((img: any) => { if (typeof img === 'string' && img && !imgs.includes(img)) imgs.push(img); });
                    }
                  } catch (e) {
                    // fallback if not JSON
                  }
                }
                return (
                  <div key={w.id} className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                    <div className="h-48 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {imgs.length > 0 ? (
                        <div className="flex w-full h-full">
                          {imgs.slice(0,3).map((src: string, i: number) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt={`${w.name}-${i}`} className={`object-cover ${i===0? 'w-2/3': 'w-1/3'} h-full`} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500 p-4">No image</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-zinc-900 dark:text-white">{w.id} — {w.name}</div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">Price: {(() => { const raw = w.price; const parsed = typeof raw === 'number' ? raw : (typeof (raw as any) === 'string' ? parseFloat((raw as any).replace(/[^0-9.-]+/g, '')) : NaN); return !isNaN(parsed) ? `$${parsed.toFixed(2)}` : (raw ? String(raw) : 'N/A'); })()} • {(w as any).currency || 'N/A'} • ABV: {(w as any).abv ?? 'N/A'} • Vol: {(w as any).volume ?? 'N/A'}</div>
                      <div className="text-sm truncate mt-2"><a href={w.url || '#'} target="_blank" rel="noreferrer" className="text-amber-600">Source link</a></div>
                      <div className="flex items-center gap-2 mt-3">
                        {/* Edit and Delete buttons removed */}
                        <Button size="sm" onClick={() => { setImagesModalWine(w); setImagesModalOpen(true); }} className="h-8">
                          View Images
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <WineImagesModal
        productId={imagesModalWine?.id ?? null}
        mainImage={imagesModalWine?.image_url}
        otherImages={imagesModalWine?.all_images}
        open={imagesModalOpen}
        onOpenChange={(open) => {
          if (!open) setImagesModalWine(null);
          setImagesModalOpen(open);
        }}
      />

      {/* bottom pagination duplicate when parent provided */}
      {onPageChange && (
        <div className="mt-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Page {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || isLoading} className="h-8 w-8 p-0">
                &lt;
              </Button>
              <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || isLoading} className="h-8 w-8 p-0">
                &gt;
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wine</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this wine? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
