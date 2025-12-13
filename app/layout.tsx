import './globals.css'
import React from 'react'
import { Providers } from '../lib/providers'

export const metadata = {
  title: 'Live Leaderboard',
  description: 'Multi-tenant real-time competitions platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
