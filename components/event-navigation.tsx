'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { EventCache } from '@/lib/cache'
import { useAuth } from '@/lib/auth-context'

export function EventNavigation() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { role } = useAuth()
  const eventSlug = params.eventSlug as string
  const [eventName, setEventName] = useState<string>('')
  const cache = EventCache.getInstance()

  useEffect(() => {
    // Try to get event name from cache first
    const cacheKey = `event_${eventSlug}`
    const cachedEvent = cache.get(cacheKey)
    
    if (cachedEvent) {
      setEventName(cachedEvent.event?.name || cachedEvent.name || '')
    } else {
      // Fetch event name
      fetch(`/api/events/${eventSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.event) {
            setEventName(data.event.name)
            cache.set(cacheKey, data, 5 * 60 * 1000) // Cache for 5 minutes
          }
        })
        .catch(() => {})
    }

    // Prefetch critical routes for faster navigation
    const prefetchRoutes = [
      { url: `/api/events/${eventSlug}/leaderboard`, key: `leaderboard_${eventSlug}` },
      { url: `/api/event/settings?eventSlug=${eventSlug}`, key: `settings_${eventSlug}` },
    ]
    
    // Batch prefetch after a short delay to not block initial render
    setTimeout(() => {
      cache.prefetchBatch(prefetchRoutes)
    }, 100)
  }, [eventSlug])

  // Preload route on hover
  const handleMouseEnter = (route: string) => {
    router.prefetch(route)
  }

  if (!eventSlug) return null

  const isAdmin = pathname?.includes('/admin')
  const isJudge = pathname?.includes('/judge')
  const isStage = pathname?.includes('/stage')
  const isParticipant = pathname?.includes('/participant')

  // Determine role indicator
  const roleIndicator = session ? (
    role === 'admin' ? (
      <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs font-medium rounded border border-purple-500/30">
        Admin
      </span>
    ) : role === 'judge' ? (
      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded border border-blue-500/30">
        Judge
      </span>
    ) : null
  ) : null

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-medium"
            >
              ← Dashboard
            </Link>
            <div className="border-l border-slate-700 pl-6">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white truncate max-w-xs">
                  {eventName || eventSlug}
                </h1>
                {roleIndicator}
              </div>
              <p className="text-xs text-slate-400 font-mono">{eventSlug}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/e/${eventSlug}`}
              onMouseEnter={() => handleMouseEnter(`/e/${eventSlug}`)}
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                !isAdmin && !isJudge && !isStage && !isParticipant
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              📊 Leaderboard
            </Link>
            <Link
              href={`/e/${eventSlug}/stage`}
              onMouseEnter={() => handleMouseEnter(`/e/${eventSlug}/stage`)}
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                isStage
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              📺 Stage
            </Link>
            {role === 'admin' && (
              <Link
                href={`/e/${eventSlug}/admin`}
                onMouseEnter={() => handleMouseEnter(`/e/${eventSlug}/admin`)}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  isAdmin
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                ⚙️ Admin
              </Link>
            )}
            {role === 'judge' && (
              <Link
                href={`/e/${eventSlug}/judge`}
                onMouseEnter={() => handleMouseEnter(`/e/${eventSlug}/judge`)}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  isJudge
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                ⚖️ Judge Console
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
