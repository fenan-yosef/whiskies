'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="wp-shell flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-72 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  );
}
