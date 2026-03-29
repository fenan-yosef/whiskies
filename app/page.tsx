'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FiPlus, 
  FiAlertCircle, 
  FiRefreshCw, 
  FiFilter, 
  FiDatabase, 
  FiTag, 
  FiMapPin, 
  FiLayers,
  FiSearch,
  FiTrendingUp,
  FiBox
} from 'react-icons/fi';
import { 
  BarChart3, 
  LayoutDashboard, 
  Sparkles, 
  FilterX,
  ChevronDown
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import WineTable from '@/components/WineTable';
import WineModal from '@/components/WineModal';
import PaginationComponent from '@/components/PaginationComponent';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Wine } from '@/lib/mockData';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';

interface ApiResponse {
  success: boolean;
  data: Wine[];
  total: number;
  total_distinct_urls?: number;
  total_with_image?: number;
  min_id?: number | null;
  max_id?: number | null;
  page: number;
  totalPages: number;
  error?: string;
  usingMockData?: boolean;
}

interface FilterResponse {
  success: boolean;
  data: string[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'id_asc' | 'id_desc' | 'scraped_at_desc' | 'scraped_at_asc'>('id_desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);

  // filter params
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [distilleryFilter, setDistilleryFilter] = useState<string | null>(null);

  // load filter options
  const { data: brandsData } = useSWR<FilterResponse>('/api/whiskies/filters?field=brand', fetcher);
  const { data: regionsData } = useSWR<FilterResponse>('/api/whiskies/filters?field=region', fetcher);
  const { data: countriesData } = useSWR<FilterResponse>('/api/whiskies/filters?field=country', fetcher);
  const { data: categoriesData } = useSWR<FilterResponse>('/api/whiskies/filters?field=category', fetcher);
  const { data: distilleriesData } = useSWR<FilterResponse>('/api/whiskies/filters?field=distillery', fetcher);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.append('q', search);
    p.append('page', page.toString());
    
    if (sort === 'id_asc') {
      p.append('sortBy', 'id');
      p.append('sortOrder', 'asc');
    } else if (sort === 'id_desc') {
      p.append('sortBy', 'id');
      p.append('sortOrder', 'desc');
    } else if (sort === 'scraped_at_desc') {
      p.append('sortBy', 'scraped_at');
      p.append('sortOrder', 'desc');
    } else {
      p.append('sortBy', 'scraped_at');
      p.append('sortOrder', 'asc');
    }

    if (brandFilter) p.append('brand', brandFilter);
    if (regionFilter) p.append('region', regionFilter);
    if (countryFilter) p.append('country', countryFilter);
    if (categoryFilter) p.append('category', categoryFilter);
    if (distilleryFilter) p.append('distillery', distilleryFilter);
    return p;
  }, [search, page, sort, brandFilter, regionFilter, countryFilter, categoryFilter, distilleryFilter]);

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/whiskies?${queryParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
    }
  );

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

  const clearFilters = () => {
    setBrandFilter(null);
    setRegionFilter(null);
    setCountryFilter(null);
    setCategoryFilter(null);
    setDistilleryFilter(null);
    setSearch('');
    setPage(1);
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
    toast.success('Inventory synchronized');
  };

  const isDbDown = data?.error && data?.usingMockData;
  const activeFiltersCount = [brandFilter, regionFilter, countryFilter, categoryFilter, distilleryFilter].filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden">
      {/* Top Navigation / Breadcrumbs */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-zinc-900 dark:text-white">Whiskies</span>
          </div>
          {isLoading && (
            <Badge variant="outline" className="animate-pulse bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              Syncing...
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            className="h-9 px-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <Button
            onClick={handleAddClick}
            size="sm"
            className="h-9 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl px-4 font-semibold shadow-lg shadow-zinc-200 dark:shadow-none"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-12">
          
          {/* Welcome Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Inventory <span className="text-zinc-400 font-light">Overview</span>
              </h1>
              <p className="text-zinc-500 font-medium">
                Monitor metrics, search catalog and manage distillery listings.
              </p>
            </div>

            {/* Global Stats Inline */}
            <div className="flex gap-8 px-6 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Total Products</span>
                  <span className="text-2xl font-black text-zinc-900 dark:text-white">
                    {data?.total?.toLocaleString() ?? '—'}
                  </span>
               </div>
               <div className="w-px bg-zinc-100 dark:bg-zinc-800" />
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">With Media</span>
                  <span className="text-2xl font-black text-amber-500">
                    {data?.total_with_image?.toLocaleString() ?? '—'}
                  </span>
               </div>
               <div className="w-px bg-zinc-100 dark:bg-zinc-800" />
               <div className="flex flex-col text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">Page</span>
                  <span className="text-2xl font-black">{page} of {data?.totalPages ?? 1}</span>
               </div>
            </div>
          </div>

          {/* Error Alert */}
          {isDbDown && (
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 rounded-2xl">
              <FiAlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Database is currently offline. Viewing cached session data.
              </AlertDescription>
            </Alert>
          )}

          {/* Search & Actions Bar */}
          <div className="sticky top-0 z-20 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 flex gap-3">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <FiSearch className="w-5 h-5 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                  </div>
                  <SearchBar 
                    onSearch={handleSearch} 
                    className="w-full h-14 pl-12 pr-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all text-lg font-medium" 
                  />
                </div>
                <Button 
                  onClick={() => setShowFilters(!showFilters)}
                  variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"}
                  className={`h-14 px-6 rounded-2xl gap-2 font-bold transition-all ${
                    showFilters || activeFiltersCount > 0 
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" 
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600"
                  }`}
                >
                  <FiFilter className="w-5 h-5" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-1 bg-amber-500 text-white rounded-full px-1.5 min-w-[20px] h-5">
                      {activeFiltersCount}
                    </Badge>
                  )}
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              <div className="lg:col-span-4">
                <div className="h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center px-4 gap-4 shadow-sm">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter whitespace-nowrap">Sort by</span>
                  <select 
                    value={sort} 
                    onChange={(e) => setSort(e.target.value as any)}
                    className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="id_desc">Recently Added</option>
                    <option value="id_asc">Oldest Entries</option>
                    <option value="scraped_at_desc">Scrape Date (New)</option>
                    <option value="scraped_at_asc">Scrape Date (Old)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Expandable Filters Overlay */}
            {showFilters && (
              <Card className="p-6 rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Refine Results
                  </h3>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs font-bold text-zinc-500 hover:text-red-500">
                    <FilterX className="w-3.5 h-3.5 mr-1.5" />
                    Reset All
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5">
                      <FiTag className="w-3 h-3 text-amber-500" /> Brand
                    </label>
                    <SearchableSelect
                      options={[{ label: 'All Brands', value: '__all' }, ...(brandsData?.data || []).map(b => ({ label: b, value: b }))]}
                      value={brandFilter ?? '__all'}
                      onValueChange={(v) => { setBrandFilter(v === '__all' ? null : v); setPage(1); }}
                      placeholder="All Brands"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5">
                      <FiMapPin className="w-3 h-3 text-blue-500" /> Region
                    </label>
                    <SearchableSelect
                      options={[{ label: 'All Regions', value: '__all' }, ...(regionsData?.data || []).map(r => ({ label: r, value: r }))]}
                      value={regionFilter ?? '__all'}
                      onValueChange={(v) => { setRegionFilter(v === '__all' ? null : v); setPage(1); }}
                      placeholder="All Regions"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5">
                      <FiLayers className="w-3 h-3 text-emerald-500" /> Country
                    </label>
                    <SearchableSelect
                      options={[{ label: 'All Countries', value: '__all' }, ...(countriesData?.data || []).map(c => ({ label: c, value: c }))]}
                      value={countryFilter ?? '__all'}
                      onValueChange={(v) => { setCountryFilter(v === '__all' ? null : v); setPage(1); }}
                      placeholder="All Countries"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5">
                      <BarChart3 className="w-3 h-3 text-purple-500" /> Category
                    </label>
                    <SearchableSelect
                      options={[{ label: 'All Categories', value: '__all' }, ...(categoriesData?.data || []).map(c => ({ label: c, value: c }))]}
                      value={categoryFilter ?? '__all'}
                      onValueChange={(v) => { setCategoryFilter(v === '__all' ? null : v); setPage(1); }}
                      placeholder="All Categories"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5">
                      <FiDatabase className="w-3 h-3 text-pink-500" /> Distillery
                    </label>
                    <SearchableSelect
                      options={[{ label: 'All Distilleries', value: '__all' }, ...(distilleriesData?.data || []).map(d => ({ label: d, value: d }))]}
                      value={distilleryFilter ?? '__all'}
                      onValueChange={(v) => { setDistilleryFilter(v === '__all' ? null : v); setPage(1); }}
                      placeholder="All Distilleries"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <Card className="rounded-[2.5rem] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden">
             <WineTable
                wines={data?.data || []}
                isLoading={isLoading}
                onEdit={handleEditClick}
                onDelete={handleDeleteWine}
                currentPage={page}
                totalPages={data?.totalPages || 1}
                onPageChange={setPage}
              />
          </Card>
        </div>
      </div>

      <WineModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveWine}
        wine={selectedWine}
      />
    </div>
  );
}

