'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FiPlus, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import SearchBar from '@/components/SearchBar';
import WineTable from '@/components/WineTable';
import WineModal from '@/components/WineModal';
import PaginationComponent from '@/components/PaginationComponent';
import { Wine } from '@/lib/mockData';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';

interface ApiResponse {
  success: boolean;
  data: Wine[];
  total: number;
  min_id?: number | null;
  max_id?: number | null;
  page: number;
  totalPages: number;
  error?: string;
  usingMockData?: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'id_asc' | 'id_desc' | 'scraped_at_desc' | 'scraped_at_asc'>('id_asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.append('q', search);
  queryParams.append('page', page.toString());
  if (sort === 'id_asc') {
    queryParams.append('sortBy', 'id');
    queryParams.append('sortOrder', 'asc');
  } else if (sort === 'id_desc') {
    queryParams.append('sortBy', 'id');
    queryParams.append('sortOrder', 'desc');
  } else if (sort === 'scraped_at_desc') {
    queryParams.append('sortBy', 'scraped_at');
    queryParams.append('sortOrder', 'desc');
  } else {
    queryParams.append('sortBy', 'scraped_at');
    queryParams.append('sortOrder', 'asc');
  }

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/whiskies?${queryParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
    }
  );

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearch(query);
      setPage(1);
    }, 500),
    []
  );

  const handleSearch = (query: string) => {
    debouncedSearch(query);
  };

  const handleAddClick = () => {
    setSelectedWine(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (wine: Wine) => {
    setSelectedWine(wine);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedWine(null);
  };

  const handleSaveWine = async (formData: any) => {
    try {
      const isUpdate = 'id' in formData;
      const method = isUpdate ? 'PUT' : 'POST';
      const url = '/api/whiskies';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save wine');
      }

      await mutate();
      handleModalClose();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save wine');
    }
  };

  const handleDeleteWine = async (id: number) => {
    try {
      const response = await fetch(`/api/whiskies?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete wine');
      }

      await mutate();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete wine');
    }
  };

  const handleRefresh = () => {
    mutate();
    toast.success('Data refreshed');
  };

  const isDbDown = data?.error && data?.usingMockData;

  return (
    <>
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Wines Inventory</h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                  Manage and explore your wine collection
                </p>
              </div>
              <Button
                onClick={handleAddClick}
                className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2"
              >
                <FiPlus className="w-5 h-5" />
                Add Wine
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Total Items</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {isLoading ? '—' : (data?.max_id ?? data?.total ?? 0)}
              </p>
            </Card>
            <Card className="p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Total Pages</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {isLoading ? '—' : data?.totalPages || 0}
              </p>
            </Card>
            <Card className="p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Current Page</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {isLoading ? '—' : data?.page || 1}
              </p>
            </Card>
          </div>

          {/* Error Alert */}
          {isDbDown && (
            <Alert className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <FiAlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Database is currently unavailable. Using mock data for demonstration. Changes will not persist when the
                database comes back online.
              </AlertDescription>
            </Alert>
          )}

          {/* Search Bar */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            <Select
              value={sort}
              onValueChange={(value: 'id_asc' | 'id_desc' | 'scraped_at_desc' | 'scraped_at_asc') => {
                setSort(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id_asc">ID: Low to High</SelectItem>
                <SelectItem value="id_desc">ID: High to Low</SelectItem>
                <SelectItem value="scraped_at_desc">Newest First</SelectItem>
                <SelectItem value="scraped_at_asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <div className="mb-6 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 bg-transparent"
            >
              <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="mb-8">
            <WineTable
              wines={data?.data || []}
              isLoading={isLoading}
              onEdit={handleEditClick}
              onDelete={handleDeleteWine}
            />
          </div>

          {/* Pagination */}
          {data && (
            <div className="flex justify-between items-center">
              <PaginationComponent
                currentPage={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <WineModal isOpen={isModalOpen} onClose={handleModalClose} onSave={handleSaveWine} wine={selectedWine} />
    </>
  );
}
