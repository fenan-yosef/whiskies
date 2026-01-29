'use client';

import { Button } from '@/components/ui/button';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationComponentProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function PaginationComponent({ currentPage, totalPages, onPageChange, isLoading }: PaginationComponentProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="h-8 w-8 p-0"
        >
          <FiChevronLeft className="w-4 h-4" />
        </Button>

        {pageNumbers.map((page, idx) => (
          <div key={idx}>
            {page === '...' ? (
              <span className="px-2 py-1 text-zinc-400">...</span>
            ) : (
              <Button
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                disabled={isLoading}
                className={`h-8 w-8 p-0 ${page === currentPage ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
              >
                {page}
              </Button>
            )}
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="h-8 w-8 p-0"
        >
          <FiChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
