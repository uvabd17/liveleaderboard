'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTheme } from '@/lib/theme'

interface Participant {
  id: string
  name: string
  kind: string
  totalScore: number
  rank: number
}

interface Event {
  name: string
  organization: {
    name: string
  }
  logoUrl?: string | null
  brandColors?: { primary: string; secondary: string; accent: string } | null
  rules?: any
}

export default function StagePage() {
  const params = useParams()
  const eventSlug = params.eventSlug as string

  const [event, setEvent] = useState<Event | null>(null)
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])
  const [roundsConfig, setRoundsConfig] = useState<any[]>([])
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0)
  const [isTimerExpanded, setIsTimerExpanded] = useState<boolean | null>(null)
  const [viewMode, setViewMode] = useState<'podium' | 'full'>('podium')
  const [topN, setTopN] = useState<number>(3)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const participantsPerPage = 50
  const { setEventColors } = useTheme()

  useEffect(() => {
    fetchLeaderboard()
    const cleanupSse = setupSSE()
    return () => {
      if (typeof cleanupSse === 'function') cleanupSse()
      setEventColors(null)
    }
  }, [eventSlug, setEventColors])

  // Update expanded/collapsed default when event or rounds change
  useEffect(() => {
    if (!event) return
    // threshold from event.rules.features.timerCollapseThresholdMinutes (minutes)
    const threshold = (event.rules && event.rules.features && event.rules.features.timerCollapseThresholdMinutes) ?? 1
    const round = roundsConfig[currentRoundIdx]
    if (!round) return
    const duration = Number(round.roundDurationMinutes || round.duration || 0)
    // If user hasn't manually toggled, set default based on threshold
    if (isTimerExpanded === null) {
      setIsTimerExpanded(duration > threshold)
    }
  }, [event, roundsConfig, currentRoundIdx])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/events/${eventSlug}/leaderboard`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
        setAllParticipants(data.participants || [])
        if (data.event?.brandColors) {
          setEventColors(data.event.brandColors)
        }
        // Also load rounds config (non-blocking)
        try {
          const r = await fetch(`/api/rounds?eventSlug=${eventSlug}`)
          if (r.ok) {
            const rd = await r.json()
            setRoundsConfig(rd.rounds || [])
            setCurrentRoundIdx((rd.currentRound ?? 0) || 0)
          }
        } catch {}
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }

  const setupSSE = () => {
    const eventSource = new EventSource(`/api/sse?eventSlug=${eventSlug}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'leaderboard-update' || data.type === 'leaderboard' || data.type === 'snapshot') {
          const participants = data.leaderboard || data.participants || []
          setAllParticipants(participants)
        }
        if (data.type === 'round-change') {
          // payload: { currentRound, roundsConfig }
          if (typeof data.currentRound === 'number') setCurrentRoundIdx(data.currentRound)
          if (Array.isArray(data.roundsConfig)) setRoundsConfig(data.roundsConfig)
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error)
      }
    }

    return () => eventSource.close()
  }

  // Filter participants by search query
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return allParticipants
    const query = searchQuery.toLowerCase()
    return allParticipants.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.kind.toLowerCase().includes(query)
    )
  }, [allParticipants, searchQuery])

  // Get top N participants for podium view
  const topParticipants = useMemo(() => {
    return filteredParticipants.slice(0, topN)
  }, [filteredParticipants, topN])

  // Paginated participants for full view
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * participantsPerPage
    const end = start + participantsPerPage
    return filteredParticipants.slice(start, end)
  }, [filteredParticipants, currentPage])

  const totalPages = Math.ceil(filteredParticipants.length / participantsPerPage)

  const currentRound = roundsConfig[currentRoundIdx] || null

  // Timer calculation (if round has timerStartedAt)
  const computeTimeLeft = (round: any) => {
    if (!round) return null
    const total = (Number(round.roundDurationMinutes || round.duration || 0) || 0) * 60
    const startedAt = round.timerStartedAt ? new Date(round.timerStartedAt).getTime() : null
    if (!startedAt) return { total, left: total, running: false }
    const now = Date.now()
    const elapsed = Math.floor((now - startedAt) / 1000)
    const left = Math.max(0, total - elapsed)
    return { total, left, running: left > 0 }
  }

  const timerState = computeTimeLeft(currentRound)
  const formatMS = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  // Tick to update timer every second when running
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let id: any = null
    if (timerState && timerState.running) {
      id = setInterval(() => setTick(t => t + 1), 1000)
    }
    return () => { if (id) clearInterval(id) }
  }, [currentRoundIdx, !!(timerState && timerState.running)])

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }


  const renderPodium = () => {
    if (topParticipants.length === 0) {
      return (
        <div className="text-center text-white text-2xl py-12">
          No participants yet
        </div>
      )
    }

    // For top 1, show single winner
    if (topN === 1 && topParticipants.length >= 1) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center animate-fade-in">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl p-12 w-full max-w-md flex flex-col items-center justify-center border-4 border-yellow-500 shadow-2xl">
              <div className="text-9xl mb-6">🥇</div>
              <div className="text-4xl font-bold text-slate-900 text-center mb-4">
                {topParticipants[0]?.name}
              </div>
              <div className="text-5xl font-bold text-slate-900">
                {topParticipants[0]?.totalScore}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // For top 2, show 1st and 2nd
    if (topN === 2 && topParticipants.length >= 2) {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-center gap-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="bg-slate-700 rounded-t-3xl p-8 w-64 h-48 flex flex-col items-center justify-center border-4 border-slate-600">
                <div className="text-6xl mb-4">🥈</div>
                <div className="text-2xl font-bold text-white text-center mb-2">
                  {topParticipants[1]?.name}
                </div>
                <div className="text-3xl font-bold text-blue-400">
                  {topParticipants[1]?.totalScore}
                </div>
              </div>
              <div className="bg-slate-600 w-full h-32 rounded-b-xl"></div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center animate-fade-in">
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-t-3xl p-8 w-72 h-64 flex flex-col items-center justify-center border-4 border-yellow-500 shadow-2xl">
                <div className="text-8xl mb-4">🥇</div>
                <div className="text-3xl font-bold text-slate-900 text-center mb-2">
                  {topParticipants[0]?.name}
                </div>
                <div className="text-4xl font-bold text-slate-900">
                  {topParticipants[0]?.totalScore}
                </div>
              </div>
              <div className="bg-yellow-500 w-full h-48 rounded-b-xl shadow-xl"></div>
            </div>
          </div>
        </div>
      )
    }

    // For top 3+, show traditional podium with additional winners
    const medalEmojis: Record<number, string> = {
      0: '🥇',
      1: '🥈',
      2: '🥉',
    }

    return (
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {topParticipants.map((participant, index) => {
            const isTop3 = index < 3
            const medal = medalEmojis[index] || ''
            const isFirst = index === 0
            
            return (
              <div
                key={participant.id}
                className={`flex flex-col items-center animate-fade-in ${
                  isFirst ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`rounded-t-3xl p-6 w-full flex flex-col items-center justify-center border-4 shadow-xl ${
                    isFirst
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-500 h-64'
                      : isTop3
                      ? 'bg-slate-700 border-slate-600 h-48'
                      : 'bg-slate-800 border-slate-700 h-40'
                  }`}
                >
                  <div className={`${isFirst ? 'text-8xl' : isTop3 ? 'text-6xl' : 'text-4xl'} mb-3`}>
                    {medal || `#${index + 1}`}
                  </div>
                  <div
                    className={`${isFirst ? 'text-3xl' : 'text-2xl'} font-bold ${
                      isFirst ? 'text-slate-900' : 'text-white'
                    } text-center mb-2`}
                  >
                    {participant.name}
                  </div>
                  <div
                    className={`${isFirst ? 'text-4xl' : 'text-3xl'} font-bold ${
                      isFirst ? 'text-slate-900' : 'text-blue-400'
                    }`}
                  >
                    {participant.totalScore}
                  </div>
                </div>
                <div
                  className={`w-full rounded-b-xl ${
                    isFirst
                      ? 'bg-yellow-500 h-48'
                      : isTop3
                      ? 'bg-slate-600 h-32'
                      : 'bg-slate-700 h-24'
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'linear-gradient(135deg, var(--brand-primary, #0f172a), var(--brand-secondary, #0b1220) 50%, var(--brand-accent, #05203a))' }}>
      {/* Header */}
      <div className="mb-12 flex flex-col items-center md:flex-row md:justify-between gap-6">
        <div className="flex items-center gap-6">
          {event.logoUrl && (
            <div className="w-28 h-28 rounded-lg overflow-hidden border-2 border-white/20 bg-white/5 flex-shrink-0">
              <img src={event.logoUrl} alt={`${event.name} logo`} className="w-full h-full object-contain" />
            </div>
          )}
          <div className="text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">{event.name}</h1>
            <p className="text-lg text-slate-200">{event.organization.name}</p>
          </div>
        </div>
        {/* Timer / Round Info */}
        <div className="flex flex-col items-center md:items-end">
          <div className="mb-2 text-sm text-slate-200">{currentRound ? (currentRound.name || `Round ${currentRoundIdx + 1}`) : 'No round'}</div>
          <div className="flex items-center gap-3">
            <div className={`${isTimerExpanded ? 'px-6 py-4 rounded-lg shadow-xl' : 'px-3 py-2 rounded-md'} bg-white/6 border border-white/10 text-white font-mono text-lg`}>
              {timerState ? (isTimerExpanded ? formatMS(timerState.left) : `${Math.ceil((timerState.left||0)/60)}m`) : (currentRound ? `${currentRound.roundDurationMinutes || currentRound.duration || 0}m` : '--')}
            </div>
            <button onClick={() => setIsTimerExpanded(v => v === null ? true : !v)} className="px-3 py-2 bg-white/6 border border-white/10 rounded-md text-sm text-white">
              {isTimerExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-8 gap-4 flex-wrap">
        <div className="bg-slate-800 rounded-lg p-2 flex gap-2">
          <button
            onClick={() => {
              setViewMode('podium')
              setCurrentPage(1)
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'podium'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 Podium View
          </button>
          <button
            onClick={() => {
              setViewMode('full')
              setCurrentPage(1)
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'full'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Full Leaderboard
          </button>
        </div>

        {/* Top N Selector (only in podium mode) */}
        {viewMode === 'podium' && (
          <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2">
            <span className="text-slate-300 px-2">Top</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search (only in full mode) */}
      {viewMode === 'full' && (
        <div className="max-w-2xl mx-auto mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search participants..."
            className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Podium View */}
      {viewMode === 'podium' && renderPodium()}

      {/* Full Leaderboard View */}
      {viewMode === 'full' && (
        <div className="max-w-5xl mx-auto">
          <div className="space-y-4 mb-6">
            {paginatedParticipants.map((participant, index) => {
              const globalIndex = (currentPage - 1) * participantsPerPage + index
              return (
                <div
                  key={participant.id}
                  className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border-2 border-slate-700 hover:border-blue-500 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-5xl font-bold text-slate-600 w-20 text-center">
                        {globalIndex < 3 ? (globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : '🥉') : `#${globalIndex + 1}`}
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white mb-1">
                          {participant.name}
                        </div>
                        <div className="text-lg text-slate-400 capitalize">
                          {participant.kind}
                        </div>
                      </div>
                    </div>
                    <div className="text-5xl font-bold text-blue-400">
                      {participant.totalScore}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Previous
              </button>
              <span className="text-white text-lg">
                Page {currentPage} of {totalPages} ({filteredParticipants.length} participants)
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {paginatedParticipants.length === 0 && (
            <div className="text-center text-white text-2xl py-12">
              {searchQuery ? 'No participants found' : 'No participants yet'}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
