"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiDatabase, FiSettings, FiBarChart2, FiUsers } from 'react-icons/fi';
import { clsx } from 'clsx';

const menuItems = [
  { name: 'Dashboard', icon: FiHome, href: '/admin' },
  { name: 'Whiskies', icon: FiDatabase, href: '/admin/whiskies' },
  { name: 'Analytics', icon: FiBarChart2, href: '/admin/analytics' },
  { name: 'Users', icon: FiUsers, href: '/admin/users' },
  { name: 'Settings', icon: FiSettings, href: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-zinc-900 text-zinc-300 flex flex-col fixed left-0 top-0 border-r border-zinc-800">
      <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-zinc-900 font-bold">
          W
        </div>
        <span className="text-xl font-bold text-white tracking-tight">WhiskyAdmin</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-amber-500 text-zinc-900 font-medium shadow-lg shadow-amber-500/20" 
                  : "hover:bg-zinc-800 hover:text-white"
              )}
            >
              <item.icon className={clsx("text-xl", isActive ? "text-zinc-900" : "text-zinc-500 group-hover:text-amber-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-zinc-500 to-zinc-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-xs text-zinc-500 truncate">admin@whisky.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
