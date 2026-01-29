export default function Loading() {
  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-zinc-900 dark:bg-zinc-900 fixed h-screen border-r border-zinc-800" />

      {/* Main content skeleton */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl">
            {/* Header skeleton */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mt-2" />
                </div>
                <div className="h-10 w-32 bg-amber-500 rounded animate-pulse" />
              </div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded">
                  <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mt-2" />
                </div>
              ))}
            </div>

            {/* Search skeleton */}
            <div className="mb-6">
              <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Table skeleton */}
            <div className="mb-8">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 animate-pulse" />
                ))}
              </div>
            </div>

            {/* Pagination skeleton */}
            <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
