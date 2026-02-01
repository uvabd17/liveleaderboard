'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { EventNavigation } from '@/components/event-navigation'
import { EventCache } from '@/lib/cache'
import { useTheme } from '@/lib/theme'
import { Navbar } from '@/components/ui/navbar'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
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
  Gavel
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
      // Safe cleanup - wrap in try-catch
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
        
        // Only process if this message is newer than the last one
        // This prevents out-of-order SSE messages from showing stale data
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
      // Safe cleanup - wrap in try-catch
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-slate-400 font-medium">Loading standings...</div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
          <p className="text-slate-400 mb-6">The event you're looking for doesn't exist.</p>
          <Link href="/" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(234,179,8,0.3)]">🥇</div>
    if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/50 flex items-center justify-center text-lg">🥈</div>
    if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/50 flex items-center justify-center text-lg">🥉</div>
    return <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-sm">#{rank}</div>
  }

  const getRankChange = (p: Participant) => {
    if (!p.previousRank || p.previousRank === p.rank) return <span className="text-slate-600">-</span>
    const diff = p.previousRank - p.rank
    if (diff > 0) return <span className="text-emerald-400 text-sm font-medium">+{diff} ▲</span>
    return <span className="text-rose-400 text-sm font-medium">{diff} ▼</span>
  }

  const TimerHUD = () => {
    const activeRound = roundsConfig[currentRoundIdx]
    const [timeLeft, setTimeLeft] = useState<string>('')

    useEffect(() => {
      if (!activeRound?.timerRunning || !activeRound?.timerStartedAt) {
        setTimeLeft(activeRound?.timerPausedAt ? 'PAUSED' : 'LOCKED')
        return
      }

      const interval = setInterval(() => {
        const startedAt = new Date(activeRound.timerStartedAt).getTime()
        const durationMs = (activeRound.roundDurationMinutes || activeRound.durationMinutes || 0) * 60 * 1000
        const now = Date.now()
        const elapsed = now - startedAt
        const remaining = Math.max(0, durationMs - elapsed)

        if (remaining === 0) {
          setTimeLeft('FINISHED')
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
      <div className="flex flex-col items-center md:items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">{activeRound.name || `Round ${currentRoundIdx + 1}`}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${activeRound.timerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
        </div>
        <div className="text-4xl md:text-5xl font-black font-outfit text-white tracking-tighter italic">
          {timeLeft}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 font-sans">
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-16" />

      {/* Event Header */}
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in-up">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {event.organization.name}
                </span>
                {event.features?.isEnded && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                    FINAL RESULTS
                  </span>
                )}
                {connected ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live Updates
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Reconnecting...
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2 text-glow">{event.name}</h1>
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {participants.length} Participants</span>
                <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Real-time Scoring</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <TimerHUD />
              <div className="h-12 w-[1px] bg-white/5 hidden md:block" />
              <div className="flex flex-wrap justify-center gap-3">
                {role === 'admin' && (
                  <Link
                    href={`/e/${eventSlug}/admin`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all font-medium"
                  >
                    <Settings className="w-4 h-4" /> Admin
                  </Link>
                )}
                {role === 'judge' && (
                  <Link
                    href={`/e/${eventSlug}/judge`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all font-medium"
                  >
                    <Gavel className="w-4 h-4" /> Judge
                  </Link>
                )}
                <Link
                  href={`/e/${eventSlug}/stage`}
                  className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all"
                >
                  <MonitorPlay className="w-4 h-4" /> Live Display
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        {participants.length === 0 ? (
          <div className="glass-panel p-16 text-center rounded-3xl animate-fade-in-up">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
              <Trophy className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Competition Hasn't Started</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Scores will appear here automatically as soon as judges start submitting them.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up delay-100 relative z-10">
            {/* Search & Filter Bar */}
            <div className="glass-card p-2 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find Participant..."
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-900/50 border border-white/5 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="col-span-2 md:col-span-1">Rank</div>
                <div className="col-span-6 md:col-span-5">Participant</div>
                <div className="hidden md:block col-span-2">Score</div>
                <div className="hidden md:block col-span-2 text-center">Change</div>
                <div className="col-span-4 md:col-span-2 text-right">Total</div>
              </div>

              <div className="divide-y divide-white/5">
                {paginatedParticipants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="col-span-2 md:col-span-1 font-mono font-bold text-slate-500">
                      {getRankBadge(p.rank)}
                    </div>

                    <div className="col-span-6 md:col-span-5">
                      <div className="font-semibold text-white group-hover:text-blue-400 transition-colors text-base md:text-lg truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">{p.kind}</div>
                    </div>

                    <div className="hidden md:block col-span-2">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min((p.totalScore / 500) * 100, 100)}%` }} // Arbitrary max for visualization
                        />
                      </div>
                    </div>

                    <div className="hidden md:block col-span-2 text-center">
                      {getRankChange(p)}
                    </div>

                    <div className="col-span-4 md:col-span-2 text-right">
                      <span className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tabular-nums">
                        {p.totalScore}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronsLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="text-sm text-slate-400 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronsRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
