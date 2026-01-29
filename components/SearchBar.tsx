'use client';

import React from "react"

import { useState, useCallback } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative flex items-center">
      <FiSearch className="absolute left-3 w-5 h-5 text-zinc-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        disabled={isLoading}
        placeholder="Search by name, distillery, region..."
        className="w-full pl-10 pr-10 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
      />
      {query && (
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="absolute right-3 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
        >
          <FiX className="w-4 h-4 text-zinc-400" />
        </button>
      )}
    </div>
  );
}
