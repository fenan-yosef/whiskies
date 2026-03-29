'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiLogOut, 
  FiBarChart2
} from 'react-icons/fi';
import { 
  Wine as WineIcon, 
  ChevronRight,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Analytics', href: '/analytics', icon: FiBarChart2 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-40 flex flex-col shadow-2xl shadow-zinc-200/50 dark:shadow-none">
      {/* Brand Section */}
      <div className="p-8">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center text-xl font-black text-white dark:text-zinc-900 transform group-hover:rotate-12 transition-transform duration-300 shadow-xl shadow-zinc-200 dark:shadow-none">
            <WineIcon className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-zinc-900 dark:text-white leading-none tracking-tight">VINTAGE</h1>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-1">Reserve Manager</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-8 py-4">
          
          {/* Main Menu */}
          <div>
            <h2 className="px-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">Main Menu</h2>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                      isActive 
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none" 
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-amber-500' : 'group-hover:text-zinc-900 dark:group-hover:text-white'}`} />
                      <span className="text-sm font-bold tracking-tight">{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* removed Quick Access and Admin sections per user request */}

        </div>
      </ScrollArea>

      {/* User Profile / Status */}
      <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-4 mb-6">
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-white dark:border-zinc-800 shadow-md flex items-center justify-center text-white font-black text-xs">
              AD
           </div>
           <div className="flex flex-col">
              <span className="text-sm font-black text-zinc-900 dark:text-white leading-tight">Admin User</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">System Overseer</span>
           </div>
        </div>
        <button className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 transition-all font-bold text-sm">
          <FiLogOut className="w-4 h-4" />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
}

// Minimal ScrollArea component since we don't have it imported or need it complex
function ScrollArea({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={`overflow-y-auto ${className}`}>{children}</div>;
}

