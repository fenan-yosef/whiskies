'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { FiGrid, FiList } from 'react-icons/fi';
import { Whisky } from '@/lib/mockData';
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

interface WhiskyTableProps {
  whiskies: Whisky[];
  isLoading: boolean;
  onEdit: (whisky: Whisky) => void;
  onDelete: (id: number) => Promise<void>;
  // optional pagination props — if provided, pagination will be rendered
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function WhiskyTable({ whiskies, isLoading, onEdit, onDelete, currentPage = 1, totalPages = 1, onPageChange, }: WhiskyTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteId);
      toast.success('Whisky deleted successfully');
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete whisky');
    } finally {
      setIsDeleting(false);
    }
  };

  if (whiskies.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-zinc-500">No whiskies found. Try adjusting your search or add a new whisky.</p>
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
              <TableHead className="font-semibold text-zinc-900 dark:text-white">Name</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white">Price</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white">Distillery</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white">Region</TableHead>
              <TableHead className="font-semibold text-zinc-900 dark:text-white">ABV / Volume</TableHead>
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
              whiskies.map((whisky) => (
                <TableRow
                  key={whisky.id}
                  className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <TableCell className="font-medium text-zinc-900 dark:text-white">{whisky.name}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-zinc-400">{whisky.price}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-zinc-400">{whisky.distillery}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-zinc-400">{whisky.region}</TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                    {whisky.abv && whisky.volume ? `${whisky.abv} / ${whisky.volume}` : whisky.abv || whisky.volume}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(whisky)}
                        className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900"
                      >
                        <FiEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(whisky.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                      >
                        <FiTrash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
              whiskies.map((w) => (
                <div key={w.id} className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                  <div className="h-48 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {w.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.image_url} alt={w.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="text-sm text-zinc-500 p-4">No image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-zinc-900 dark:text-white">{w.name}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">{w.distillery} • {w.region}</div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-sm text-zinc-700 dark:text-zinc-300">{w.price}</div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(w)} className="h-8 w-8 p-0">
                          <FiEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(w.id)} className="h-8 w-8 p-0">
                          <FiTrash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
            <AlertDialogTitle>Delete Whisky</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this whisky? This action cannot be undone.</AlertDialogDescription>
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
