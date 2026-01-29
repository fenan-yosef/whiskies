"use client";

import Sidebar from '../../components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        {children}
      </div>
    </div>
  );
}
