'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  FiLayers
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
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchBarResetKey, setSearchBarResetKey] = useState(0);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'id_asc' | 'id_desc' | 'scraped_at_desc' | 'scraped_at_asc'>('id_asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);

  // filter params
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [distilleryFilter, setDistilleryFilter] = useState<string | null>(null);
  const [hasImagesFilter, setHasImagesFilter] = useState(false);
  const [hasReviewsFilter, setHasReviewsFilter] = useState(false);

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
    if (hasImagesFilter) p.append('has_images', '1');
    if (hasReviewsFilter) p.append('has_reviews', '1');
    return p;
  }, [search, page, sort, brandFilter, regionFilter, countryFilter, categoryFilter, distilleryFilter, hasImagesFilter, hasReviewsFilter]);

  const { data, isLoading, mutate } = useSWR<ApiResponse>(
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

  useEffect(() => {
    return () => {
      debouncedSearch.cancel?.();
    };
  }, [debouncedSearch]);

  const handleSearch = (query: string) => {
    debouncedSearch(query);
  };

  const clearFilters = () => {
    debouncedSearch.cancel?.();
    setBrandFilter(null);
    setRegionFilter(null);
    setCountryFilter(null);
    setCategoryFilter(null);
    setDistilleryFilter(null);
    setHasImagesFilter(false);
    setHasReviewsFilter(false);
    setSearch('');
    setSort('id_asc');
    setPage(1);
    setShowFilters(false);
    setSearchBarResetKey((k) => k + 1);
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
  const activeFiltersCount = [brandFilter, regionFilter, countryFilter, categoryFilter, distilleryFilter].filter(Boolean).length + Number(hasImagesFilter) + Number(hasReviewsFilter);
  const hasAnyAppliedControls = Boolean(search) || activeFiltersCount > 0 || sort !== 'id_asc';

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="wp-topbar z-20 flex h-[74px] shrink-0 items-center justify-between border-b border-slate-200/80 px-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <LayoutDashboard className="h-4 w-4 text-[#2271b1]" />
            <span>Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900">Inventory</span>
          </div>
          <Badge className="hidden border border-[#2271b1]/30 bg-[#2271b1]/10 text-[11px] font-semibold text-[#135e96] sm:inline-flex">
            Whiskies
          </Badge>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="h-10 rounded-xl border-slate-300 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-white"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleAddClick}
            className="h-10 rounded-xl border border-[#135e96] bg-[#2271b1] px-4 font-semibold text-white shadow-lg shadow-blue-900/20 hover:bg-[#135e96]"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
          <section className="wp-card animate-rise rounded-[28px] p-5 md:p-7">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2271b1]">Editorial Control Panel</p>
                <h1 className="wp-heading mt-2 text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
                  Whisky Inventory Command Center
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                  A polished, client-comfortable CMS interface with richer visual hierarchy, smoother motion, and focused inventory controls from Online-dimensions.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                    {isLoading ? 'Syncing inventory' : 'Live database feed'}
                  </Badge>
                  <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                    {activeFiltersCount} active filters
                  </Badge>
                  <Badge className="border border-blue-200 bg-blue-50 text-[#135e96]">
                    Page {page} of {data?.totalPages ?? 1}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-7">
                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total Products</p>
                    <FiDatabase className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">{data?.total?.toLocaleString() ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">Indexed entries in your catalog</p>
                </div>

                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">With Media</p>
                    <FiLayers className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">{data?.total_with_image?.toLocaleString() ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">Products enriched with imagery</p>
                </div>

                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">View Window</p>
                    <BarChart3 className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">{data?.totalPages ?? 1}</p>
                  <p className="mt-1 text-xs text-slate-500">Total pages in this result set</p>
                </div>

                <div className="wp-stat-card rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filters Applied</p>
                    <FiFilter className="h-4 w-4 text-[#2271b1]" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">{activeFiltersCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Focused catalog constraints</p>
                </div>
              </div>
            </div>
          </section>

          {isDbDown && (
            <Alert className="wp-card animate-rise-delay-1 rounded-2xl border-amber-200 bg-amber-50/95 text-amber-900">
              <FiAlertCircle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-800">
                Database is currently offline. You are viewing cached session data.
              </AlertDescription>
            </Alert>
          )}

          <section className="animate-rise-delay-1 space-y-4">
            <Card className="wp-card rounded-3xl p-4 md:p-5">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                <div className="flex flex-col gap-3 sm:flex-row xl:col-span-8">
                  <SearchBar
                    key={searchBarResetKey}
                    onSearch={handleSearch}
                    className="w-full"
                    inputClassName="h-12 rounded-xl border-slate-300 bg-white/90 text-slate-800 shadow-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#2271b1]/30"
                  />

                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`h-12 rounded-xl px-5 font-semibold transition-all ${
                      showFilters || activeFiltersCount > 0
                        ? 'border border-[#135e96] bg-[#2271b1] text-white hover:bg-[#135e96]'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FiFilter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-inherit">
                        {activeFiltersCount}
                      </span>
                    )}
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>

                  {hasAnyAppliedControls && (
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="h-12 rounded-xl border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FilterX className="mr-2 h-4 w-4" />
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="xl:col-span-4">
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-300 bg-white/90 px-4 shadow-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sort</span>
                    <select
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value as any);
                        setPage(1);
                      }}
                      className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                    >
                      <option value="id_desc">Recently Added</option>
                      <option value="id_asc">Oldest Entries</option>
                      <option value="scraped_at_desc">Scrape Date (New)</option>
                      <option value="scraped_at_asc">Scrape Date (Old)</option>
                    </select>
                  </div>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-slate-200 bg-[#f7fafd] p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <Sparkles className="h-4 w-4 text-[#2271b1]" />
                      Refine Results
                    </h3>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
                    >
                      <FilterX className="mr-1.5 h-3.5 w-3.5" />
                      Reset All
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <FiTag className="h-3.5 w-3.5 text-[#2271b1]" />
                        Brand
                      </label>
                      <SearchableSelect
                        options={[{ label: 'All Brands', value: '__all' }, ...(brandsData?.data || []).map((b) => ({ label: b, value: b }))]}
                        value={brandFilter ?? '__all'}
                        onValueChange={(v) => { setBrandFilter(v === '__all' ? null : v); setPage(1); }}
                        placeholder="All Brands"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <FiMapPin className="h-3.5 w-3.5 text-[#2271b1]" />
                        Region
                      </label>
                      <SearchableSelect
                        options={[{ label: 'All Regions', value: '__all' }, ...(regionsData?.data || []).map((r) => ({ label: r, value: r }))]}
                        value={regionFilter ?? '__all'}
                        onValueChange={(v) => { setRegionFilter(v === '__all' ? null : v); setPage(1); }}
                        placeholder="All Regions"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <FiLayers className="h-3.5 w-3.5 text-[#2271b1]" />
                        Country
                      </label>
                      <SearchableSelect
                        options={[{ label: 'All Countries', value: '__all' }, ...(countriesData?.data || []).map((c) => ({ label: c, value: c }))]}
                        value={countryFilter ?? '__all'}
                        onValueChange={(v) => { setCountryFilter(v === '__all' ? null : v); setPage(1); }}
                        placeholder="All Countries"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <BarChart3 className="h-3.5 w-3.5 text-[#2271b1]" />
                        Category
                      </label>
                      <SearchableSelect
                        options={[{ label: 'All Categories', value: '__all' }, ...(categoriesData?.data || []).map((c) => ({ label: c, value: c }))]}
                        value={categoryFilter ?? '__all'}
                        onValueChange={(v) => { setCategoryFilter(v === '__all' ? null : v); setPage(1); }}
                        placeholder="All Categories"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <FiDatabase className="h-3.5 w-3.5 text-[#2271b1]" />
                        Distillery
                      </label>
                      <SearchableSelect
                        options={[{ label: 'All Distilleries', value: '__all' }, ...(distilleriesData?.data || []).map((d) => ({ label: d, value: d }))]}
                        value={distilleryFilter ?? '__all'}
                        onValueChange={(v) => { setDistilleryFilter(v === '__all' ? null : v); setPage(1); }}
                        placeholder="All Distilleries"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <FiLayers className="h-3.5 w-3.5 text-[#2271b1]" />
                        Has Images
                      </label>
                      <SearchableSelect
                        options={[
                          { label: 'All products', value: '__all' },
                          { label: 'Only with images', value: 'only' },
                        ]}
                        value={hasImagesFilter ? 'only' : '__all'}
                        onValueChange={(v) => {
                          setHasImagesFilter(v === 'only');
                          setPage(1);
                        }}
                        placeholder="All products"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <FiFilter className="h-3.5 w-3.5 text-[#2271b1]" />
                        Has Reviews
                      </label>
                      <SearchableSelect
                        options={[
                          { label: 'All products', value: '__all' },
                          { label: 'Only with reviews', value: 'only' },
                        ]}
                        value={hasReviewsFilter ? 'only' : '__all'}
                        onValueChange={(v) => {
                          setHasReviewsFilter(v === 'only');
                          setPage(1);
                        }}
                        placeholder="All products"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </section>

          <section className="wp-card animate-rise-delay-2 overflow-hidden rounded-[28px] p-2">
            <WineTable
              wines={data?.data || []}
              isLoading={isLoading}
              onEdit={handleEditClick}
              onDelete={handleDeleteWine}
              currentPage={page}
              totalPages={data?.totalPages || 1}
              onPageChange={setPage}
            />
          </section>
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

