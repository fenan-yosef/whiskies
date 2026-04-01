'use client';

import EmbeddingManager from '@/components/EmbeddingManager';

export default function AdminPage() {
  return (
    <div className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Search by Image</h1>
          <p className="mt-1 text-zinc-500">Find visually similar whisky bottle images with portrait-first result cards.</p>
        </div>
      </header>

      <EmbeddingManager />
    </div>
  );
}
