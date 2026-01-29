'use client';

import Link from 'next/link';
import { FiHome, FiSettings, FiLogOut } from 'react-icons/fi';

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-900 text-white z-40 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-amber-500 flex items-center justify-center text-lg font-bold text-zinc-900">
            W
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Whisky Admin</h1>
            <p className="text-xs text-zinc-400">Inventory Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-200"
        >
          <FiHome className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-200 cursor-not-allowed opacity-50"
        >
          <FiSettings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-zinc-800">
        <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-200">
          <FiLogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
