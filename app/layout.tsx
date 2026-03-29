import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Wine Inventory Manager',
  description: 'Professional wine inventory management application with search, filtering, and CRUD operations',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon.ico',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
      },
    ],
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased text-zinc-900 dark:text-zinc-50`}>
        <div className="flex h-screen bg-white dark:bg-zinc-950">
          <Sidebar />

          <main className="flex-1 ml-72 flex flex-col h-screen overflow-hidden">
            {children}
          </main>
        </div>

        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
