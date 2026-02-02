'use client'

import { LayoutDashboard, Target, Gavel, Trophy, Settings, Activity } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}

export function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  }

  return (
    <div className={`inline-flex flex-col items-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-charcoal/20 dark:border-white/20 border-t-charcoal dark:border-t-white rounded-full animate-spin`}
        role="status"
        aria-label={label || "Loading"}
      >
        <span className="sr-only">{label || "Loading..."}</span>
      </div>
      {label && <span className="text-sm text-charcoal/60 dark:text-white/60 font-medium">{label}</span>}
    </div>
  )
}

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-charcoal/10 dark:bg-white/10 rounded-xl w-3/4 mb-3"></div>
      <div className="h-4 bg-charcoal/10 dark:bg-white/10 rounded-xl w-1/2"></div>
    </div>
  )
}

// Map common page names to icons
const pageIcons: Record<string, React.ElementType> = {
  'Dashboard': LayoutDashboard,
  'Event Admin': Settings,
  'Rounds': Target,
  'Rubric': Gavel,
  'Scoring': Gavel,
  'Leaderboard': Trophy,
  'Settings': Settings,
  'Analytics': Activity,
}

interface PageLoadingProps {
  message?: string
  submessage?: string
}

export function PageLoading({ message = "Loading...", submessage }: PageLoadingProps) {
  // Get icon based on message, default to Activity
  const IconComponent = pageIcons[message] || Activity

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-950 flex items-center justify-center">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-charcoal/5 dark:bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-charcoal/5 dark:bg-white/5 rounded-full blur-[120px]" />
      </div>
      
      <div className="text-center space-y-6 max-w-md px-6">
        {/* Animated Logo with Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="relative w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-charcoal/10 dark:border-white/10 flex items-center justify-center shadow-lg overflow-hidden">
            {/* Pulse ring effect */}
            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 animate-ping" style={{ animationDuration: '2s' }} />
            {/* Icon */}
            <IconComponent className="w-8 h-8 text-charcoal/60 dark:text-white/60 relative z-10 animate-pulse" style={{ animationDuration: '1.5s' }} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-display font-semibold text-charcoal dark:text-white">{message}</h2>
          <p className="text-charcoal/50 dark:text-white/50 text-sm">{submessage || "Please wait..."}</p>
        </div>
        
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

