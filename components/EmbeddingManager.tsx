'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronUp,
  FiCpu,
  FiExternalLink,
  FiMaximize2,
  FiMinimize2,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiSquare,
  FiUpload,
  FiX,
} from 'react-icons/fi';

type ManagerTab = 'embedding' | 'search';
type JobControlAction = 'pause' | 'resume' | 'cancel';

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
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  limit?: number | null;
  total: number;
  processed: number;
  embedded: number;
  failed: number;
  skipped: number;
  progress: number;
  pause_requested?: boolean;
  cancel_requested?: boolean;
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
const SEARCH_RESULTS_PER_PAGE = 10;

const FINAL_STATUSES = new Set<EmbeddingJobStatus['status']>(['completed', 'failed', 'cancelled']);

export default function EmbeddingManager() {
  const [activeTab, setActiveTab] = useState<ManagerTab>('search');

  const [health, setHealth] = useState<EmbeddingHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const [startingEmbed, setStartingEmbed] = useState(false);
  const [embedLimit, setEmbedLimit] = useState(60000);
  const [job, setJob] = useState<EmbeddingJobStatus | null>(null);
  const [jobError, setJobError] = useState('');
  const [controlAction, setControlAction] = useState<JobControlAction | null>(null);

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobModalMinimized, setJobModalMinimized] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  const [queryImage, setQueryImage] = useState<File | null>(null);
  const [topK, setTopK] = useState(8);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultsPage, setResultsPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const [embedMessage, setEmbedMessage] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<number | null>(null);

  const queryPreview = useMemo(() => {
    if (!queryImage) return '';
    return URL.createObjectURL(queryImage);
  }, [queryImage]);

  const totalResultPages = Math.max(1, Math.ceil(results.length / SEARCH_RESULTS_PER_PAGE));

  const pagedResults = useMemo(() => {
    const start = (resultsPage - 1) * SEARCH_RESULTS_PER_PAGE;
    return results.slice(start, start + SEARCH_RESULTS_PER_PAGE);
  }, [results, resultsPage]);

  const activeProgress = Math.min(100, Math.max(0, Number(job?.progress || 0)));
  const isJobActive = Boolean(job && !FINAL_STATUSES.has(job.status));
  const canPause = Boolean(job && (job.status === 'running' || job.status === 'queued'));
  const canResume = Boolean(job && job.status === 'paused');
  const canStop = Boolean(job && !FINAL_STATUSES.has(job.status));

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
      if (queryPreview) {
        URL.revokeObjectURL(queryPreview);
      }
    };
  }, [queryPreview]);

  useEffect(() => {
    setResultsPage((current) => Math.min(current, totalResultPages));
  }, [totalResultPages]);

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

  const isJobNotFoundError = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') {
      return false;
    }
    const candidate = err as { status?: number; notFound?: boolean; message?: string };
    if (candidate.notFound || candidate.status === 404) {
      return true;
    }
    return typeof candidate.message === 'string' && /job not found/i.test(candidate.message);
  };

  const clearTrackedJob = (message?: string) => {
    stopTrackingJob();
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    setJob(null);
    setJobModalOpen(false);
    setJobModalMinimized(false);
    if (message) {
      setEmbedMessage(message);
    }
  };

  const applyJobPayload = async (payload: EmbeddingJobStatus) => {
    setJob(payload);
    setJobError('');

    if (FINAL_STATUSES.has(payload.status)) {
      localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      if (payload.status === 'completed') {
        setEmbedMessage(payload.message || `Embedding complete: ${payload.embedded} vectors saved`);
      } else if (payload.status === 'cancelled') {
        setEmbedMessage(payload.message || 'Embedding job stopped');
      } else {
        setEmbedMessage(payload.message || `Embedding job ${payload.status}`);
      }
      await loadHealth();
    }
  };

  const loadJobStatus = async (jobId: string) => {
    const res = await fetch(`/api/embeddings/jobs/${jobId}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      const errorMessage = data?.detail || data?.error || 'Failed to load job status';
      const error = new Error(errorMessage) as Error & { status?: number; notFound?: boolean };
      error.status = res.status;
      error.notFound = res.status === 404 || /job not found/i.test(String(errorMessage));
      throw error;
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
      if (isJobNotFoundError(err)) {
        clearTrackedJob('The previous job no longer exists on the server. Start a new embedding run.');
        return;
      }
      setJobError(err instanceof Error ? err.message : String(err));
    }

    const stream = new EventSource(`/api/embeddings/jobs/${jobId}/stream`);
    eventSourceRef.current = stream;

    stream.onopen = () => {
      setSseConnected(true);
    };

    stream.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data) as { ok?: boolean; error?: string; job_id?: string; status?: string };

        if (raw?.ok === false) {
          clearTrackedJob(raw.error || 'Embedding stream closed by server.');
          return;
        }

        if (!raw?.job_id || !raw?.status) {
          return;
        }

        const payload = raw as unknown as EmbeddingJobStatus;
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
        if (isJobNotFoundError(err)) {
          clearTrackedJob('Embedding job was removed or server restarted. Tracking stopped.');
          return;
        }
        setJobError(err instanceof Error ? err.message : String(err));
      });
    }, 2500);
  };

  const handleReindex = async () => {
    setStartingEmbed(true);
    setEmbedMessage('');
    setJobError('');
    setActiveTab('embedding');

    try {
      const res = await fetch('/api/embeddings/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: embedLimit }),
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setEmbedMessage(data?.error || data?.detail || 'Failed to start embedding');
      } else {
        setEmbedMessage('Embedding job started. You can switch tabs and keep using the app.');
        await startTrackingJob(data.job_id, true);
      }
      await loadHealth();
    } catch (err) {
      setEmbedMessage(`Failed to reindex: ${String(err)}`);
    } finally {
      setStartingEmbed(false);
    }
  };

  const handleJobControl = async (action: JobControlAction) => {
    if (!job) return;

    setControlAction(action);
    setJobError('');

    try {
      const res = await fetch(`/api/embeddings/jobs/${job.job_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data?.detail || data?.error || `Failed to ${action} job`);
      }

      await applyJobPayload(data as EmbeddingJobStatus);

      if (action === 'pause') {
        setEmbedMessage('Pause requested. Job will pause at the next checkpoint.');
      } else if (action === 'resume') {
        setEmbedMessage('Continue requested. Job is resuming.');
      } else {
        setEmbedMessage('Stop requested. Job will terminate shortly.');
      }
    } catch (err) {
      setJobError(String(err));
    } finally {
      setControlAction(null);
    }
  };

  const handleSearch = async () => {
    if (!queryImage) {
      setSearchMessage('Pick an image first');
      return;
    }

    setSearching(true);
    setSearchMessage('');
    setResultsPage(1);
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
        setSearchMessage(data?.error || data?.detail || 'Search failed');
        return;
      }

      const nextResults = Array.isArray(data.results) ? (data.results as SearchResult[]) : [];
      setResults(nextResults);
      setSearchMessage(`Found ${data.count ?? nextResults.length ?? 0} similar images`);
    } catch (err) {
      setSearchMessage(`Search failed: ${String(err)}`);
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
    <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Vector Embedding Manager</h2>
          <p className="text-sm text-zinc-500">Run long embedding jobs and search by image in separate tabs.</p>
        </div>
        <button
          onClick={() => void loadHealth()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <FiRefreshCw className={loadingHealth ? 'animate-spin' : ''} /> Refresh status
        </button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <p className="text-xs text-zinc-500">Indexed</p>
          <p className="text-xl font-semibold">{health?.indexed ?? 0}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60 md:col-span-2">
          <p className="text-xs text-zinc-500">Model</p>
          <p className="text-sm font-medium">{health?.model || 'n/a'}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <p className="text-xs text-zinc-500">Device</p>
          <p className="inline-flex items-center gap-2 text-sm font-medium uppercase">
            <FiCpu /> {health?.device || 'n/a'}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <p className="text-xs text-zinc-500">Service</p>
          <p className={`text-sm font-medium ${health?.ok ? 'text-emerald-500' : 'text-red-500'}`}>
            {health?.ok ? 'Online' : 'Offline'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Jobs: {health?.running_jobs ?? 0}</p>
        </div>
      </div>

      <div className="mb-5 inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
          }`}
        >
          Image Search
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('embedding')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'embedding'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
          }`}
        >
          Embedding Jobs
        </button>
      </div>

      {activeTab === 'embedding' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Start a background embedding run</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Rows to embed
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={embedLimit}
                  onChange={(e) => setEmbedLimit(Number(e.target.value || 60000))}
                  className="w-40 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </label>

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
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <FiMaximize2 /> Open Progress
                </button>
              )}

              <span className="text-xs text-zinc-500">SSE: {sseConnected ? 'connected' : 'disconnected'}</span>
            </div>

            {job && (
              <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>Status: {job.status}</span>
                  <span>{activeProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${activeProgress}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded bg-white p-2 dark:bg-zinc-900/60">
                    <p className="text-zinc-500">Total</p>
                    <p className="font-semibold">{job.total}</p>
                  </div>
                  <div className="rounded bg-white p-2 dark:bg-zinc-900/60">
                    <p className="text-zinc-500">Done</p>
                    <p className="font-semibold">{job.processed}</p>
                  </div>
                  <div className="rounded bg-white p-2 dark:bg-zinc-900/60">
                    <p className="text-zinc-500">Embedded</p>
                    <p className="font-semibold">{job.embedded}</p>
                  </div>
                  <div className="rounded bg-white p-2 dark:bg-zinc-900/60">
                    <p className="text-zinc-500">Failed/Skipped</p>
                    <p className="font-semibold">{job.failed + job.skipped}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canPause && (
                    <button
                      type="button"
                      onClick={() => void handleJobControl('pause')}
                      disabled={controlAction !== null}
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiPause /> {controlAction === 'pause' ? 'Pausing...' : 'Pause'}
                    </button>
                  )}
                  {canResume && (
                    <button
                      type="button"
                      onClick={() => void handleJobControl('resume')}
                      disabled={controlAction !== null}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                    >
                      <FiPlay /> {controlAction === 'resume' ? 'Continuing...' : 'Continue'}
                    </button>
                  )}
                  {canStop && (
                    <button
                      type="button"
                      onClick={() => void handleJobControl('cancel')}
                      disabled={controlAction !== null}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <FiSquare /> {controlAction === 'cancel' ? 'Stopping...' : 'Stop'}
                    </button>
                  )}
                </div>

                <p className="text-xs text-zinc-500">{job.message || 'Running...'}</p>
              </div>
            )}
          </div>

          {embedMessage && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              {embedMessage}
            </div>
          )}

          {jobError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {jobError}
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Search by uploading an image</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Top K
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value || 8))}
                  className="w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Query image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQueryImage(e.target.files?.[0] || null)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </label>

              <button
                onClick={handleSearch}
                disabled={searching || !queryImage}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-70 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <FiSearch /> {searching ? 'Searching...' : 'Search Similar'}
              </button>
            </div>
          </div>

          {searchMessage && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              {searchMessage}
            </div>
          )}

          {(results.length > 0 || queryPreview) && (
            <div className="grid gap-4 lg:grid-cols-5">
              {queryPreview && (
                <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Query</p>
                  <div className="flex h-64 md:h-72 lg:h-80 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <img src={queryPreview} alt="query" className="max-h-full w-full object-contain" />
                  </div>
                </div>
              )}

              <div className="lg:col-span-4 space-y-3">
                {results.length > SEARCH_RESULTS_PER_PAGE && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                    <p>
                      Showing {(resultsPage - 1) * SEARCH_RESULTS_PER_PAGE + 1}-
                      {Math.min(resultsPage * SEARCH_RESULTS_PER_PAGE, results.length)} of {results.length}
                    </p>
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        disabled={resultsPage === 1}
                        onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-700"
                      >
                        Prev
                      </button>
                      <span>
                        Page {resultsPage} / {totalResultPages}
                      </span>
                      <button
                        type="button"
                        disabled={resultsPage === totalResultPages}
                        onClick={() => setResultsPage((p) => Math.min(totalResultPages, p + 1))}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-700"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {pagedResults.map((item) => (
                    <button
                      key={item.image_id}
                      type="button"
                      onClick={() => setSelectedResult(item)}
                      className="text-left rounded-lg border border-zinc-200 p-2 transition-colors hover:border-amber-400 dark:border-zinc-700 dark:hover:border-amber-500"
                    >
                      <div className="mb-2 flex h-64 md:h-72 lg:h-80 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={previewForResult(item)}
                          alt={item.product_name}
                          className="max-h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <p className="line-clamp-2 text-sm font-medium">{item.product_name || `Product ${item.product_id}`}</p>
                      <p className="mt-1 text-xs text-zinc-500">Score: {item.score.toFixed(4)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {job && jobModalOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,440px)] rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <div>
              <p className="text-sm font-semibold">Embedding Progress</p>
              <p className="text-xs text-zinc-500">Job {job.job_id.slice(0, 10)}...</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={minimizeProgressModal}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Minimize progress modal"
              >
                <FiMinimize2 />
              </button>
              <button
                onClick={closeProgressModal}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close progress modal"
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Status: {job.status}</span>
              <span>{activeProgress.toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${activeProgress}%` }} />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded bg-zinc-50 p-2 dark:bg-zinc-800/60">
                <p className="text-zinc-500">Total</p>
                <p className="font-semibold">{job.total}</p>
              </div>
              <div className="rounded bg-zinc-50 p-2 dark:bg-zinc-800/60">
                <p className="text-zinc-500">Done</p>
                <p className="font-semibold">{job.processed}</p>
              </div>
              <div className="rounded bg-zinc-50 p-2 dark:bg-zinc-800/60">
                <p className="text-zinc-500">Embedded</p>
                <p className="font-semibold">{job.embedded}</p>
              </div>
              <div className="rounded bg-zinc-50 p-2 dark:bg-zinc-800/60">
                <p className="text-zinc-500">Failed/Skipped</p>
                <p className="font-semibold">{job.failed + job.skipped}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canPause && (
                <button
                  type="button"
                  onClick={() => void handleJobControl('pause')}
                  disabled={controlAction !== null}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <FiPause /> {controlAction === 'pause' ? 'Pausing...' : 'Pause'}
                </button>
              )}

              {canResume && (
                <button
                  type="button"
                  onClick={() => void handleJobControl('resume')}
                  disabled={controlAction !== null}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                >
                  <FiPlay /> {controlAction === 'resume' ? 'Continuing...' : 'Continue'}
                </button>
              )}

              {canStop && (
                <button
                  type="button"
                  onClick={() => void handleJobControl('cancel')}
                  disabled={controlAction !== null}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  <FiSquare /> {controlAction === 'cancel' ? 'Stopping...' : 'Stop'}
                </button>
              )}
            </div>

            <p className="text-xs text-zinc-500">{job.message || 'Running...'}</p>
          </div>
        </div>
      )}

      {job && !jobModalOpen && (jobModalMinimized || isJobActive) && (
        <button
          type="button"
          onClick={openProgressModal}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <FiChevronUp />
          <span className="text-sm">{job.status === 'paused' ? 'Paused' : 'Embed'} {activeProgress.toFixed(0)}%</span>
        </button>
      )}

      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedResult(null)}>
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{selectedResult.product_name}</h3>
                <p className="text-sm text-zinc-500">Similarity score: {selectedResult.score.toFixed(4)}</p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FiX />
              </button>
            </div>

            <div className="mb-4 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <img
                src={previewForResult(selectedResult)}
                alt={selectedResult.product_name}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-zinc-500">Brand:</span> {selectedResult.brand || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Source:</span> {selectedResult.source || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Category:</span> {selectedResult.category || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Distillery:</span> {selectedResult.distillery || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Region:</span> {selectedResult.region || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Country:</span> {selectedResult.country || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Style:</span> {selectedResult.style || '-'}
              </p>
              <p>
                <span className="text-zinc-500">ABV / Volume:</span> {selectedResult.abv || '-'} / {selectedResult.volume || '-'}
              </p>
            </div>

            {selectedResult.product_url && (
              <div className="mt-4">
                <a
                  href={selectedResult.product_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
