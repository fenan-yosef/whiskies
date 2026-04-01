import React from "react"
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: '--font-body',
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-heading',
  weight: ['600', '700'],
});

export const metadata: Metadata = {
  title: 'Whisky Inventory Manager',
  description: 'Professional whisky inventory management application with search, filtering, and CRUD operations',
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
      <body className={`${plusJakartaSans.variable} ${playfairDisplay.variable} font-sans antialiased text-zinc-900 dark:text-zinc-50 wp-body`}>
        <div className="wp-shell flex min-h-screen">
          <Sidebar />

          <main className="flex-1 ml-72 flex flex-col min-h-screen">
            {children}
          </main>
        </div>

        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
