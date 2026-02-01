import './globals.css'
import React from 'react'
import { Providers } from '../lib/providers'
import { Outfit } from 'next/font/google'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const metadata = {
  title: 'Live Leaderboard - The Real-time Competition Platform',
  description: 'Host professional hackathons and competitions with zero-latency live leaderboards.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏆</text></svg>'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${outfit.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`min-h-screen bg-background text-foreground antialiased ${outfit.className}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
