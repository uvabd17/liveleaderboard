'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { EventCache } from '@/lib/cache'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-context'
import {
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MonitorPlay,
  Activity,
  Users,
  Settings,
  Gavel,
  ArrowLeft
} from 'lucide-react'

interface Participant {
  id: string
  name: string
  kind: string
  totalScore: number
  rank: number
  previousRank?: number
  momentum?: number
}

interface Event {
  id: string
  name: string
  slug: string
  brandColors?: {
    primary: string
    secondary: string
    accent: string
  }
  organization: {
    name: string
  }
  features?: any
}

export default function EventLeaderboardPage() {
  const { role } = useAuth()
  const params = useParams()
  const eventSlug = params.eventSlug as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [searchQuery, setSearchQuery] = useState('')

  const [roundsConfig, setRoundsConfig] = useState<any[]>([])
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0)

  const cache = EventCache.getInstance()
  const { setEventColors } = useTheme()

  useEffect(() => {
    fetchLeaderboard()
    const cleanupSse = setupSSE()
    return () => {
      if (typeof cleanupSse === 'function') cleanupSse()
      setEventColors(null)
    }
  }, [eventSlug, setEventColors])

  const fetchLeaderboard = async () => {
    const cacheKey = `leaderboard_${eventSlug}`
    const cached = cache.get(cacheKey)

    if (cached) {
      setEvent(cached.event)
      setParticipants(cached.participants)
      setLoading(false)
    }

    try {
      const response = await fetch(`/api/events/${eventSlug}/leaderboard`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
        setParticipants(data.participants)
        if (data.roundsConfig) setRoundsConfig(data.roundsConfig)
        if (typeof data.currentRound === 'number') setCurrentRoundIdx(data.currentRound)
        cache.set(cacheKey, data, 2 * 60 * 1000)
        if (data.event?.brandColors) {
          setEventColors(data.event.brandColors)
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Track last update timestamp to prevent stale data
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(0)

  const setupSSE = () => {
    const eventSource = new EventSource(`/api/sse?eventSlug=${eventSlug}`)

    eventSource.onopen = () => setConnected(true)
    eventSource.onerror = () => {
      setConnected(false)
      try {
        eventSource.close()
      } catch (e) {
        // Already closed, ignore
      }
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const messageTimestamp = data.timestamp || Date.now()
        
        if (messageTimestamp < lastUpdateTimestamp) {
          console.debug('Ignoring stale SSE message', { messageTimestamp, lastUpdateTimestamp })
          return
        }
        
        if (data.type === 'leaderboard-update') {
          setParticipants(data.participants)
          setLastUpdateTimestamp(messageTimestamp)
        } else if (data.type === 'round-change') {
          if (data.roundsConfig) setRoundsConfig(data.roundsConfig)
          if (typeof data.currentRound === 'number') setCurrentRoundIdx(data.currentRound)
          if (Array.isArray(data.leaderboard)) setParticipants(data.leaderboard)
          setLastUpdateTimestamp(messageTimestamp)
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error)
      }
    }

    return () => {
      try {
        eventSource.close()
      } catch (e) {
        // Already closed, ignore
      }
    }
  }

  const filteredParticipants = useMemo(() => {
    if (!searchQuery) return participants
    return participants.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [participants, searchQuery])

  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredParticipants.slice(startIndex, startIndex + pageSize)
  }, [filteredParticipants, currentPage, pageSize])

  const totalPages = Math.ceil(filteredParticipants.length / pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, pageSize])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-charcoal/10 border-t-charcoal rounded-full animate-spin"></div>
          <div className="text-charcoal/50 text-sm font-medium">Loading standings...</div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-charcoal/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-charcoal/30" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-charcoal mb-2">Event Not Found</h1>
          <p className="text-charcoal/50 mb-8">The event you're looking for doesn't exist.</p>
          <Link href="/" className="btn-primary px-6 py-2.5 rounded-full text-sm">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <div className="rank-badge rank-badge-gold">1</div>
    if (rank === 2) return <div className="rank-badge rank-badge-silver">2</div>
    if (rank === 3) return <div className="rank-badge rank-badge-bronze">3</div>
    return <div className="rank-badge">{rank}</div>
  }

  const getRankChange = (p: Participant) => {
    if (!p.previousRank || p.previousRank === p.rank) return <span className="text-charcoal/20">—</span>
    const diff = p.previousRank - p.rank
    if (diff > 0) return <span className="text-emerald-600 text-sm font-medium">↑{diff}</span>
    return <span className="text-rose-500 text-sm font-medium">↓{Math.abs(diff)}</span>
  }

  const TimerHUD = () => {
    const activeRound = roundsConfig[currentRoundIdx]
    const [timeLeft, setTimeLeft] = useState<string>('')

    useEffect(() => {
      if (!activeRound?.timerRunning || !activeRound?.timerStartedAt) {
        setTimeLeft(activeRound?.timerPausedAt ? 'PAUSED' : '—')
        return
      }

      const interval = setInterval(() => {
        const startedAt = new Date(activeRound.timerStartedAt).getTime()
        const durationMs = (activeRound.roundDurationMinutes || activeRound.durationMinutes || 0) * 60 * 1000
        const now = Date.now()
        const elapsed = now - startedAt
        const remaining = Math.max(0, durationMs - elapsed)

        if (remaining === 0) {
          setTimeLeft('ENDED')
          clearInterval(interval)
          return
        }

        const mins = Math.floor(remaining / 60000)
        const secs = Math.floor((remaining % 60000) / 1000)
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
      }, 1000)

      return () => clearInterval(interval)
    }, [activeRound])

    if (!activeRound) return null

    return (
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-charcoal/40 mb-1">
          {activeRound.name || `Round ${currentRoundIdx + 1}`}
        </span>
        <div className="timer-display text-3xl">
          {timeLeft}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-cream text-charcoal font-sans">
      
      {/* Minimal Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-charcoal/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-charcoal/40" />
            <span className="text-sm font-medium text-charcoal/60">Live Leaderboard</span>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-charcoal/40">
                <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30" /> Offline
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-14" />

      {/* Event Header */}
      <header className="border-b border-charcoal/5">
        <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge-minimal">
                  {event.organization.name}
                </span>
                {event.features?.isEnded && (
                  <span className="badge-minimal bg-charcoal text-cream">
                    Final
                  </span>
                )}
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
                {event.name}
              </h1>
              <div className="flex items-center gap-6 text-sm text-charcoal/50">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> {participants.length} Participants
                </span>
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Real-time
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 animate-fade-in">
              <TimerHUD />
              
              <div className="h-10 w-px bg-charcoal/10 hidden md:block" />
              
              <div className="flex items-center gap-2">
                {role === 'admin' && (
                  <Link
                    href={`/e/${eventSlug}/admin`}
                    className="btn-primary h-9 px-4 rounded-full text-sm flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5" /> Admin
                  </Link>
                )}
                {role === 'judge' && (
                  <Link
                    href={`/e/${eventSlug}/judge`}
                    className="btn-primary h-9 px-4 rounded-full text-sm flex items-center gap-2"
                  >
                    <Gavel className="w-3.5 h-3.5" /> Judge
                  </Link>
                )}
                <Link
                  href={`/e/${eventSlug}/stage`}
                  className="h-9 px-4 rounded-full text-sm flex items-center gap-2 border border-charcoal/10 text-charcoal/60 hover:border-charcoal/20 hover:text-charcoal transition-colors"
                >
                  <MonitorPlay className="w-3.5 h-3.5" /> Stage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {participants.length === 0 ? (
          <div className="card p-16 text-center animate-fade-in">
            <div className="w-16 h-16 bg-charcoal/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-8 h-8 text-charcoal/30" />
            </div>
            <h2 className="text-xl font-display font-semibold mb-2">Waiting for Scores</h2>
            <p className="text-charcoal/50 max-w-md mx-auto">
              Rankings will appear here as judges submit scores.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search participants..."
                  className="input pl-10 w-full"
                />
              </div>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="input w-auto px-4"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>

            {/* Leaderboard Table */}
            <div className="card overflow-hidden">
              {/* Table Header */}
              <div className="table-minimal-header grid grid-cols-12 gap-4 px-6 py-3">
                <div className="col-span-2 md:col-span-1">Rank</div>
                <div className="col-span-6 md:col-span-6">Participant</div>
                <div className="hidden md:block col-span-2 text-center">Change</div>
                <div className="col-span-4 md:col-span-3 text-right">Score</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-charcoal/5">
                {paginatedParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-charcoal/[0.02] transition-colors"
                  >
                    <div className="col-span-2 md:col-span-1">
                      {getRankBadge(p.rank)}
                    </div>

                    <div className="col-span-6 md:col-span-6">
                      <div className="font-medium text-charcoal truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-charcoal/40 capitalize">{p.kind}</div>
                    </div>

                    <div className="hidden md:flex col-span-2 justify-center">
                      {getRankChange(p)}
                    </div>

                    <div className="col-span-4 md:col-span-3 text-right">
                      <span className="score-display text-2xl">
                        {p.totalScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-charcoal/5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-charcoal/5 text-charcoal/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-charcoal/5 text-charcoal/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-sm text-charcoal/50">
                    Page {currentPage} of {totalPages}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-charcoal/5 text-charcoal/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-charcoal/5 text-charcoal/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
