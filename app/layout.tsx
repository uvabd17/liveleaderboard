import './globals.css'
import React from 'react'
import { Providers } from '../lib/providers'
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google'

// Primary UI font - clean, modern, highly legible
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Display font - elegant serif for headings and hero text
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

// Monospace font - for scores, timers, and data
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata = {
  title: 'LiveLeaderboard',
  description: 'Host professional hackathons and competitions with zero-latency live leaderboards.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22 fill=%22none%22><path d=%22M6 26V6L12 12V26H6Z%22 fill=%22%233b82f6%22/><path d=%22M14 26V14L20 8V26H14Z%22 fill=%22%236366f1%22/><path d=%22M22 26V4L28 10V26H22Z%22 fill=%22%2338bdf8%22/><path d=%22M4 28H28%22 stroke=%22%2394a3b8%22 stroke-width=%222%22 stroke-linecap=%22round%22/></svg>'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'system';
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const resolved = theme === 'system' ? systemTheme : theme;
                if (resolved === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`min-h-screen bg-background text-foreground antialiased ${inter.className}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
