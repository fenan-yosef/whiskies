'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronUp, FiCpu, FiExternalLink, FiMaximize2, FiMinimize2, FiRefreshCw, FiSearch, FiUpload, FiX } from 'react-icons/fi';

interface EmbeddingHealth {
  ok: boolean;
  indexed?: number;
  model?: string;
  device?: string;
  index_path?: string;
  running_jobs?: number;
  error?: string;
}

interface EmbeddingJobStatus {
  ok?: boolean;
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  limit?: number | null;
  total: number;
  processed: number;
  embedded: number;
  failed: number;
  skipped: number;
  progress: number;
  started_at?: number | null;
  finished_at?: number | null;
}

interface SearchResult {
  image_id: number;
  product_id: number;
  product_name: string;
  brand?: string;
  source?: string;
  image_url?: string;
  product_url?: string;
  price?: string | number;
  currency?: string;
  abv?: string | number;
  volume?: string | number;
  category?: string;
  distillery?: string;
  region?: string;
  country?: string;
  style?: string;
  score: number;
}

const ACTIVE_JOB_STORAGE_KEY = 'embeddings.activeJobId';
const MINIMIZED_STORAGE_KEY = 'embeddings.jobProgressMinimized';

const FINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export default function EmbeddingManager() {
  const [health, setHealth] = useState<EmbeddingHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [startingEmbed, setStartingEmbed] = useState(false);
  const [embedLimit, setEmbedLimit] = useState(60000);
  const [job, setJob] = useState<EmbeddingJobStatus | null>(null);
  const [jobError, setJobError] = useState('');
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobModalMinimized, setJobModalMinimized] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [queryImage, setQueryImage] = useState<File | null>(null);
  const [topK, setTopK] = useState(8);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [message, setMessage] = useState<string>('');

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<number | null>(null);

  const queryPreview = useMemo(() => {
    if (!queryImage) return '';
    return URL.createObjectURL(queryImage);
  }, [queryImage]);

  const activeProgress = Math.min(100, Math.max(0, Number(job?.progress || 0)));
  const isJobActive = Boolean(job && !FINAL_STATUSES.has(job.status));

  useEffect(() => {
    void loadHealth();
    const minimized = localStorage.getItem(MINIMIZED_STORAGE_KEY) === '1';
    setJobModalMinimized(minimized);

    const storedJobId = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (storedJobId) {
      void startTrackingJob(storedJobId, !minimized);
    }

    return () => {
      stopTrackingJob();
    };
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

  const stopTrackingJob = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setSseConnected(false);
  };

  const applyJobPayload = async (payload: EmbeddingJobStatus) => {
    setJob(payload);
    setJobError('');

    if (FINAL_STATUSES.has(payload.status)) {
      localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      if (payload.status === 'completed') {
        setMessage(payload.message || `Embedding complete: ${payload.embedded} vectors saved`);
      } else {
        setMessage(payload.message || `Embedding job ${payload.status}`);
      }
      await loadHealth();
    }
  };

  const loadJobStatus = async (jobId: string) => {
    const res = await fetch(`/api/embeddings/jobs/${jobId}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data?.detail || data?.error || 'Failed to load job status');
    }
    await applyJobPayload(data as EmbeddingJobStatus);
  };

  const startTrackingJob = async (jobId: string, openModal: boolean) => {
    stopTrackingJob();
    localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, jobId);

    if (openModal) {
      setJobModalOpen(true);
      setJobModalMinimized(false);
      localStorage.setItem(MINIMIZED_STORAGE_KEY, '0');
    }

    try {
      await loadJobStatus(jobId);
    } catch (err) {
      setJobError(String(err));
    }

    const stream = new EventSource(`/api/embeddings/jobs/${jobId}/stream`);
    eventSourceRef.current = stream;

    stream.onopen = () => {
      setSseConnected(true);
    };

    stream.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as EmbeddingJobStatus;
        void applyJobPayload(payload);
        if (FINAL_STATUSES.has(payload.status)) {
          stopTrackingJob();
        }
      } catch {
        // ignore malformed event payloads
      }
    };

    stream.onerror = () => {
      setSseConnected(false);
    };

    pollingRef.current = window.setInterval(() => {
      void loadJobStatus(jobId).catch((err) => {
        setJobError(String(err));
      });
    }, 2500);
  };

  const handleReindex = async () => {
    setStartingEmbed(true);
    setMessage('');
    setJobError('');
    try {
      const res = await fetch('/api/embeddings/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: embedLimit }),
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setMessage(data?.error || data?.detail || 'Failed to reindex');
      } else {
        setMessage('Embedding job started. You can minimize progress and continue using the page.');
        await startTrackingJob(data.job_id, true);
      }
      await loadHealth();
    } catch (err) {
      setMessage(`Failed to reindex: ${String(err)}`);
    } finally {
      setStartingEmbed(false);
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

  const openProgressModal = () => {
    setJobModalOpen(true);
    setJobModalMinimized(false);
    localStorage.setItem(MINIMIZED_STORAGE_KEY, '0');
  };

  const minimizeProgressModal = () => {
    setJobModalOpen(false);
    setJobModalMinimized(true);
    localStorage.setItem(MINIMIZED_STORAGE_KEY, '1');
  };

  const closeProgressModal = () => {
    setJobModalOpen(false);
    setJobModalMinimized(false);
    localStorage.setItem(MINIMIZED_STORAGE_KEY, '0');
  };

  const previewForResult = (item: SearchResult) => item.image_url || `/api/embeddings/image/${item.image_id}`;

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
        <input
          type="number"
          min={1}
          max={100000}
          value={embedLimit}
          onChange={(e) => setEmbedLimit(Number(e.target.value || 60000))}
          className="w-32 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />

        <button
          onClick={handleReindex}
          disabled={startingEmbed}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-70"
        >
          <FiUpload /> {startingEmbed ? 'Starting...' : 'Embed Images (Background)'}
        </button>

        {job && (
          <button
            onClick={openProgressModal}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <FiMaximize2 /> Open Progress
          </button>
        )}

        <span className="text-xs text-zinc-500">
          SSE: {sseConnected ? 'connected' : 'disconnected'}
        </span>

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

      {jobError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {jobError}
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
              <button
                key={item.image_id}
                type="button"
                onClick={() => setSelectedResult(item)}
                className="text-left rounded-lg border border-zinc-200 p-2 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
              >
                <img src={previewForResult(item)} alt={item.product_name} className="mb-2 h-24 w-full rounded object-cover" />
                <p className="truncate text-sm font-medium">{item.product_name || `Product ${item.product_id}`}</p>
                <p className="text-xs text-zinc-500">Score: {item.score.toFixed(4)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {job && jobModalOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,420px)] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Embedding Progress</p>
              <p className="text-xs text-zinc-500">Job {job.job_id.slice(0, 10)}...</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={minimizeProgressModal} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Minimize progress modal">
                <FiMinimize2 />
              </button>
              <button onClick={closeProgressModal} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close progress modal">
                <FiX />
              </button>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Status: {job.status}</span>
              <span>{activeProgress.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${activeProgress}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded bg-zinc-50 dark:bg-zinc-800/60 p-2">
                <p className="text-zinc-500">Total</p>
                <p className="font-semibold">{job.total}</p>
              </div>
              <div className="rounded bg-zinc-50 dark:bg-zinc-800/60 p-2">
                <p className="text-zinc-500">Done</p>
                <p className="font-semibold">{job.processed}</p>
              </div>
              <div className="rounded bg-zinc-50 dark:bg-zinc-800/60 p-2">
                <p className="text-zinc-500">Embedded</p>
                <p className="font-semibold">{job.embedded}</p>
              </div>
              <div className="rounded bg-zinc-50 dark:bg-zinc-800/60 p-2">
                <p className="text-zinc-500">Failed</p>
                <p className="font-semibold">{job.failed + job.skipped}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">{job.message || 'Running...'}</p>
          </div>
        </div>
      )}

      {job && !jobModalOpen && (jobModalMinimized || isJobActive) && (
        <button
          type="button"
          onClick={openProgressModal}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 shadow-lg"
        >
          <FiChevronUp />
          <span className="text-sm">Embed {activeProgress.toFixed(0)}%</span>
        </button>
      )}

      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedResult(null)}>
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{selectedResult.product_name}</h3>
                <p className="text-sm text-zinc-500">Similarity score: {selectedResult.score.toFixed(4)}</p>
              </div>
              <button onClick={() => setSelectedResult(null)} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <FiX />
              </button>
            </div>

            <img src={previewForResult(selectedResult)} alt={selectedResult.product_name} className="mb-4 h-64 w-full rounded-lg object-cover" />

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-zinc-500">Brand:</span> {selectedResult.brand || '-'}</p>
              <p><span className="text-zinc-500">Source:</span> {selectedResult.source || '-'}</p>
              <p><span className="text-zinc-500">Category:</span> {selectedResult.category || '-'}</p>
              <p><span className="text-zinc-500">Distillery:</span> {selectedResult.distillery || '-'}</p>
              <p><span className="text-zinc-500">Region:</span> {selectedResult.region || '-'}</p>
              <p><span className="text-zinc-500">Country:</span> {selectedResult.country || '-'}</p>
              <p><span className="text-zinc-500">Style:</span> {selectedResult.style || '-'}</p>
              <p><span className="text-zinc-500">ABV / Volume:</span> {selectedResult.abv || '-'} / {selectedResult.volume || '-'}</p>
            </div>

            {selectedResult.product_url && (
              <div className="mt-4">
                <a
                  href={selectedResult.product_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <FiExternalLink /> Open product page
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
