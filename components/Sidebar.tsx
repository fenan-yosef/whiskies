'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome,
  FiSearch,
  FiSettings,
} from 'react-icons/fi';
import { 
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Search by Image', href: '/admin', icon: FiSettings },
    // { name: 'Image Search', href: '/search', icon: FiSearch },
  ];

  return (
    <aside className="wp-sidebar fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/10 shadow-2xl shadow-black/40">
      <div className="border-b border-white/10 px-6 pb-5 pt-6">
        <div className="animate-rise flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2271b1] text-white shadow-lg shadow-blue-900/40">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="wp-heading text-lg font-semibold text-white">WHISKIES DB INSPECTOR</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#72aee6]">Client Edition</p>
          </div>
        </div>

        {/* <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-zinc-300">
          Premium CMS styling tuned for agency-friendly demos.
        </div> */}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Navigation</p>
        <nav className="mt-3 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`wp-side-link group flex items-center justify-between rounded-xl px-3.5 py-3 ${
                  isActive ? 'wp-side-link-active' : ''
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#72aee6]' : 'text-zinc-400 group-hover:text-white'}`} />
                  <span className="text-sm font-semibold">{item.name}</span>
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'translate-x-0 text-[#72aee6]' : '-translate-x-1 text-zinc-600 group-hover:translate-x-0 group-hover:text-zinc-300'}`} />
              </Link>
            );
          })}
        </nav>

        {/* <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 animate-rise-delay-1">
          <div className="flex items-center gap-2 text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-[#72aee6]" />
            <p className="text-xs font-semibold uppercase tracking-wider">Trust Layer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Interface follows familiar enterprise CMS behavior to increase client confidence during review calls.
          </p>
        </div> */}
      </div>

      <div className="border-t border-white/10 p-4">
        {/* <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2271b1] to-[#135e96] text-xs font-bold text-white">
            AD
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Admin User</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Publisher</p>
          </div>
        </div> */}

        {/* <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20">
          <FiLogOut className="h-4 w-4" />
          <span>Exit Session</span>
        </button> */}
      </div>
    </aside>
  );
}

