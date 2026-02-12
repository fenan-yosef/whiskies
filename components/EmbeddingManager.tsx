'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCpu, FiRefreshCw, FiSearch, FiUpload } from 'react-icons/fi';

interface EmbeddingHealth {
  ok: boolean;
  indexed?: number;
  model?: string;
  device?: string;
  index_path?: string;
  error?: string;
}

interface SearchResult {
  image_id: number;
  product_id: number;
  product_name: string;
  brand?: string;
  source?: string;
  image_url?: string;
  score: number;
}

export default function EmbeddingManager() {
  const [health, setHealth] = useState<EmbeddingHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [queryImage, setQueryImage] = useState<File | null>(null);
  const [topK, setTopK] = useState(8);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState<string>('');

  const queryPreview = useMemo(() => {
    if (!queryImage) return '';
    return URL.createObjectURL(queryImage);
  }, [queryImage]);

  useEffect(() => {
    void loadHealth();
  }, []);

  useEffect(() => {
    return () => {
      if (queryPreview) URL.revokeObjectURL(queryPreview);
    };
  }, [queryPreview]);

  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/embeddings/health', { cache: 'no-store' });
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ ok: false, error: String(err) });
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    setMessage('');
    try {
      const res = await fetch('/api/embeddings/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setMessage(data?.error || data?.detail || 'Failed to reindex');
      } else {
        setMessage(`Reindex completed: ${data.indexed ?? 0} images indexed`);
      }
      await loadHealth();
    } catch (err) {
      setMessage(`Failed to reindex: ${String(err)}`);
    } finally {
      setReindexing(false);
    }
  };

  const handleSearch = async () => {
    if (!queryImage) {
      setMessage('Pick an image first');
      return;
    }

    setSearching(true);
    setMessage('');
    setResults([]);
    try {
      const form = new FormData();
      form.set('image', queryImage, queryImage.name);
      form.set('top_k', String(topK));

      const res = await fetch('/api/embeddings/search', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setMessage(data?.error || data?.detail || 'Search failed');
        return;
      }

      setResults(data.results || []);
      setMessage(`Found ${data.count ?? 0} similar images`);
    } catch (err) {
      setMessage(`Search failed: ${String(err)}`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Vector Embedding Manager</h2>
          <p className="text-sm text-zinc-500">Build index from image blobs and run visual similarity search.</p>
        </div>
        <button
          onClick={() => void loadHealth()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <FiRefreshCw className={loadingHealth ? 'animate-spin' : ''} /> Refresh status
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500">Indexed</p>
          <p className="text-xl font-semibold">{health?.indexed ?? 0}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500">Model</p>
          <p className="text-sm font-medium truncate">{health?.model || 'n/a'}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500">Device</p>
          <p className="text-sm font-medium uppercase inline-flex items-center gap-2"><FiCpu /> {health?.device || 'n/a'}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500">Service</p>
          <p className={`text-sm font-medium ${health?.ok ? 'text-emerald-500' : 'text-red-500'}`}>
            {health?.ok ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleReindex}
          disabled={reindexing}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-70"
        >
          <FiUpload /> {reindexing ? 'Reindexing...' : 'Rebuild Embedding Index'}
        </button>

        <input
          type="number"
          min={1}
          max={20}
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value || 8))}
          className="w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setQueryImage(e.target.files?.[0] || null)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />

        <button
          onClick={handleSearch}
          disabled={searching || !queryImage}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-70 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <FiSearch /> {searching ? 'Searching...' : 'Search Similar'}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300">
          {message}
        </div>
      )}

      {(results.length > 0 || queryPreview) && (
        <div className="grid gap-4 lg:grid-cols-5">
          {queryPreview && (
            <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
              <p className="mb-2 text-xs font-medium text-zinc-500">Query</p>
              <img src={queryPreview} alt="query" className="h-32 w-full rounded object-cover" />
            </div>
          )}

          <div className="grid gap-3 lg:col-span-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((item) => (
              <div key={item.image_id} className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.product_name} className="mb-2 h-24 w-full rounded object-cover" />
                ) : (
                  <div className="mb-2 h-24 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                )}
                <p className="truncate text-sm font-medium">{item.product_name || `Product ${item.product_id}`}</p>
                <p className="text-xs text-zinc-500">Score: {item.score.toFixed(4)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
