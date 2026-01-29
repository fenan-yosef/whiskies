'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiPlus, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Sidebar from '@/components/Sidebar';
import SearchBar from '@/components/SearchBar';
import WhiskyTable from '@/components/WhiskyTable';
import WhiskyModal from '@/components/WhiskyModal';
import PaginationComponent from '@/components/PaginationComponent';
import { Whisky } from '@/lib/mockData';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';

interface ApiResponse {
  success: boolean;
  data: Whisky[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
  usingMockData?: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWhisky, setSelectedWhisky] = useState<Whisky | null>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  queryParams.append('page', page.toString());

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
    setSelectedWhisky(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (whisky: Whisky) => {
    setSelectedWhisky(whisky);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedWhisky(null);
  };

  const handleSaveWhisky = async (formData: any) => {
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
        throw new Error(errorData.error || 'Failed to save whisky');
      }

      await mutate();
      handleModalClose();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save whisky');
    }
  };

  const handleDeleteWhisky = async (id: number) => {
    try {
      const response = await fetch(`/api/whiskies?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete whisky');
      }

      await mutate();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete whisky');
    }
  };

  const handleRefresh = () => {
    mutate();
    toast.success('Data refreshed');
  };

  const isDbDown = data?.error && data?.usingMockData;

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Whiskies Inventory</h1>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Manage and explore your whisky collection
                  </p>
                </div>
                <Button
                  onClick={handleAddClick}
                  className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2"
                >
                  <FiPlus className="w-5 h-5" />
                  Add Whisky
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Total Items</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                  {isLoading ? '—' : data?.total || 0}
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
            <div className="mb-6">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
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
              <WhiskyTable
                whiskies={data?.data || []}
                isLoading={isLoading}
                onEdit={handleEditClick}
                onDelete={handleDeleteWhisky}
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
      </main>

      {/* Modal */}
      <WhiskyModal isOpen={isModalOpen} onClose={handleModalClose} onSave={handleSaveWhisky} whisky={selectedWhisky} />
    </div>
  );
}
