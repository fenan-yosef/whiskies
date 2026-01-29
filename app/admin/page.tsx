"use client";

import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiTrash2, FiEdit, FiChevronLeft, FiChevronRight, FiFilter, FiRefreshCw } from 'react-icons/fi';
import useSWR from 'swr';
import WhiskyModal from '../../components/WhiskyModal';
import clsx from 'clsx';

type Whisky = {
  id: number;
  name: string;
  price: string;
  distillery: string;
  region: string;
  volume: string;
  abv: string;
  scraped_at: string;
  url?: string;
  description?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWhisky, setSelectedWhisky] = useState<Whisky | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/whiskies?q=${q}&page=${page}&limit=${limit}`,
    fetcher
  );

  const whiskies: Whisky[] = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setQ(searchInput);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleCreate = () => {
    setSelectedWhisky(null);
    setIsModalOpen(true);
  };

  const handleEdit = (whisky: Whisky) => {
    setSelectedWhisky(whisky);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this whisky?')) return;
    try {
      const res = await fetch(`/api/whiskies?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        mutate();
      } else {
        alert('Failed to delete: ' + json.error);
      }
    } catch (err) {
      alert('Error deleting item');
    }
  };

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Whiskies Inventory</h1>
          <p className="text-zinc-500 mt-1">Manage and track your scraped whisky data.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-zinc-900 font-semibold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          <FiPlus className="text-xl" />
          Add Whisky
        </button>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-zinc-500 text-sm font-medium">Total Items</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-zinc-500 text-sm font-medium">Pages</p>
          <p className="text-2xl font-bold mt-1">{totalPages || 0}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-zinc-500 text-sm font-medium">Current Page</p>
          <p className="text-2xl font-bold mt-1">{page}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, distillery, or region..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => mutate()}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className={isLoading ? "animate-spin" : ""} />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <FiFilter />
              Filters
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Whisky</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Distillery</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4">ABV / Vol</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : whiskies.length > 0 ? (
                whiskies.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate max-w-[200px]" title={w.name}>
                        {w.name}
                      </div>
                      <div className="text-xs text-zinc-500">ID: {w.id}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-amber-600 dark:text-amber-500 font-semibold">
                      {w.price}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {w.distillery || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {w.region || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-sm">
                      {w.abv} / {w.volume}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(w)}
                          className="p-2 text-zinc-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(w.id)}
                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No whiskies found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            Showing <span className="font-medium text-zinc-900 dark:text-white">{total > 0 ? (page - 1) * limit + 1 : 0}-{Math.min(total, page * limit)}</span> of <span className="font-medium text-zinc-900 dark:text-white">{total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <FiChevronLeft />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1; 
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={clsx(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      page === pageNum ? "bg-amber-500 text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && <span className="text-zinc-400 mx-1">...</span>}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      <WhiskyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => mutate()}
        whisky={selectedWhisky}
      />
    </div>
  );
}

// using `clsx` imported from the package above

