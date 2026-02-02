'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Event page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-2xl font-display font-semibold text-charcoal dark:text-cream mb-2">
          Something Went Wrong
        </h1>
        
        <p className="text-charcoal/50 dark:text-cream/50 mb-8">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-charcoal dark:bg-cream text-cream dark:text-charcoal rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-charcoal/10 dark:bg-white/10 text-charcoal dark:text-cream rounded-full text-sm font-medium hover:bg-charcoal/20 dark:hover:bg-white/20 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
        
        {error.digest && (
          <p className="mt-6 text-xs text-charcoal/30 dark:text-cream/30 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
