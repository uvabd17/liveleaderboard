'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
  const [completionsMap, setCompletionsMap] = useState<Record<string, Set<number>>>({})
  const [roundsConfig, setRoundsConfig] = useState<any[]>([])
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0)
  const [isTimerExpanded, setIsTimerExpanded] = useState<boolean | null>(null)
  // Fullscreen/minimize stage UI state
  const [fullscreenRound, setFullscreenRound] = useState<number | null>(null)
  const [minimizedRounds, setMinimizedRounds] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'podium' | 'full'>('podium')
  const [topN, setTopN] = useState<number>(3)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [participantsPerPage, setParticipantsPerPage] = useState<number>(() => 50)
  const [totalParticipants, setTotalParticipants] = useState<number>(0)
  const { setEventColors } = useTheme()
  const [fullscreenLeaderboard, setFullscreenLeaderboard] = useState(false)
  const prevParticipantsRef = useRef<Participant[] | null>(null)
  const allParticipantsRef = useRef<Participant[]>([])

  useEffect(() => {
    fetchLeaderboard()
    const cleanupSse = setupSSE()
    return () => {
      if (typeof cleanupSse === 'function') cleanupSse()
      setEventColors(null)
    }
  }, [eventSlug, setEventColors])

  // Refs for detecting transitions and timers
  const prevRoundsRef = useRef<any[] | null>(null)
  const fullscreenTimeoutRef = useRef<any | null>(null)
  const intervalRef = useRef<any | null>(null)

  // Show a round fullscreen for 5 seconds, then minimize it
  const showFullscreenFor = (idx: number) => {
    if (typeof idx !== 'number') return
    if (fullscreenTimeoutRef.current) {
      clearTimeout(fullscreenTimeoutRef.current)
      fullscreenTimeoutRef.current = null
    }
    setFullscreenRound(idx)
    // remove from minimized while showing
    setMinimizedRounds(prev => prev.filter(x => x !== idx))
    fullscreenTimeoutRef.current = setTimeout(() => {
      setFullscreenRound(null)
      setMinimizedRounds(prev => Array.from(new Set([...prev, idx])))
      fullscreenTimeoutRef.current = null
    }, 5000)
  }

  // Every 30 minutes, show the current round fullscreen for 5s
  useEffect(() => {
    // 30 minutes interval
    const intervalMs = 30 * 60 * 1000
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const idx = typeof currentRoundIdx === 'number' ? currentRoundIdx : 0
      if (roundsConfig && roundsConfig.length > 0) {
        showFullscreenFor(idx)
      }
    }, intervalMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundIdx, roundsConfig])

  // Detect newly started rounds and immediately show the latest-started one fullscreen
  useEffect(() => {
    const prev = prevRoundsRef.current
    if (prev && Array.isArray(prev) && Array.isArray(roundsConfig)) {
      // find rounds which started now (timerStartedAt went from falsy to truthy or timerRunning just started)
      const started: { idx: number; ts: number }[] = []
      roundsConfig.forEach((r, idx) => {
        const prevR = prev[idx]
        const prevStarted = prevR ? (prevR.timerStartedAt || prevR.timerRunning) : false
        const nowStarted = r ? (r.timerStartedAt || r.timerRunning) : false
        if (!prevStarted && nowStarted) {
          const ts = r && r.timerStartedAt ? new Date(r.timerStartedAt).getTime() : Date.now()
          started.push({ idx, ts })
        }
      })
      if (started.length > 0) {
        // pick the latest-started
        started.sort((a, b) => b.ts - a.ts)
        showFullscreenFor(started[0].idx)
      }
    }
    prevRoundsRef.current = JSON.parse(JSON.stringify(roundsConfig || []))
  }, [roundsConfig])

  // Ensure minimized badges reflect currently active rounds (timers running or judging open)
  useEffect(() => {
    if (!Array.isArray(roundsConfig) || roundsConfig.length === 0) return
    const active: number[] = []
    roundsConfig.forEach((r, idx) => {
      const isActive = !!(r && (r.timerStartedAt || r.timerRunning || r.judgingOpen))
      if (isActive) active.push(idx)
    })
    if (active.length > 0) {
      setMinimizedRounds(prev => {
        // merge new active indices with existing minimized ones
        const merged = Array.from(new Set([...prev, ...active]))
        return merged
      })
    }
  }, [roundsConfig])

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

  const fetchLeaderboard = async (page = 1, size = participantsPerPage) => {
    try {
      const response = await fetch(`/api/events/${eventSlug}/leaderboard?page=${page}&size=${size}`)
      if (response.ok) {
        const data = await response.json()
        // preserve previous participants for movement calculation
        prevParticipantsRef.current = allParticipantsRef.current || []
        setEvent(data.event)
        setAllParticipants(data.participants || [])
        setTotalParticipants(typeof data.total === 'number' ? data.total : (data.participants || []).length)
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
        // Load round completions mapping for visual indicators
        try {
          const comps = await fetch(`/api/events/${eventSlug}/round-completions`)
          if (comps.ok) {
            const data = await comps.json()
            const map: Record<string, Set<number>> = {}
            if (Array.isArray(data.rows)) {
              for (const r of data.rows) {
                if (!r.participantId || typeof r.roundNumber !== 'number') continue
                map[r.participantId] = map[r.participantId] || new Set<number>()
                map[r.participantId].add(Number(r.roundNumber))
              }
            }
            setCompletionsMap(map)
          }
        } catch {}
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }

  // keep a ref synced with latest participants for delta calculations
  useEffect(() => {
    allParticipantsRef.current = allParticipants
  }, [allParticipants])

  // Close fullscreen leaderboard with Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenLeaderboard) setFullscreenLeaderboard(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreenLeaderboard])

  const setupSSE = () => {
    const eventSource = new EventSource(`/api/sse?eventSlug=${eventSlug}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'leaderboard-update' || data.type === 'leaderboard' || data.type === 'snapshot') {
          // refetch current page to keep server-side pagination consistent
          fetchLeaderboard(currentPage, participantsPerPage)
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

  // Paginated participants for full view (server provides current page)
  const paginatedParticipants = useMemo(() => filteredParticipants, [filteredParticipants])

  const totalPages = Math.ceil((totalParticipants || 0) / (participantsPerPage || 1))

  const currentRound = roundsConfig[currentRoundIdx] || null

  // Timer calculation (if round has timerStartedAt)
  const computeTimeLeft = (round: any) => {
    if (!round) return null
    // Only consider a timer present if it was explicitly started or marked running
    const hasTimer = !!round.timerStartedAt || !!round.timerRunning
    if (!hasTimer) return null
    const total = (Number(round.roundDurationMinutes || round.duration || 0) || 0) * 60
    const startedAt = round.timerStartedAt ? new Date(round.timerStartedAt).getTime() : null
    // If startedAt missing but marked running, treat as full time remaining
    if (!startedAt) return { total, left: total, running: !!round.timerRunning }
    const now = Date.now()
    const elapsed = Math.floor((now - startedAt) / 1000)
    const left = Math.max(0, total - elapsed)
    return { total, left, running: left > 0 }
  }

  const computeTimeLeftFor = (idx: number) => {
    const r = roundsConfig[idx]
    if (!r) return null
    return computeTimeLeft(r)
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

  // Reload leaderboard when page or page size or view mode changes
  useEffect(() => {
    // For podium mode we still want the default small fetch
    if (!eventSlug) return
    // For 'full' views, fetch with current page and size
    if (viewMode === 'full') {
      fetchLeaderboard(currentPage, participantsPerPage)
    } else {
      // podium: fetch first page small size
      fetchLeaderboard(1, Math.min(50, participantsPerPage))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, participantsPerPage, viewMode])

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
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl p-8 w-full max-w-md flex flex-col items-center justify-center border-4 border-yellow-500 shadow-lg h-72">
              <div className="text-9xl mb-3">🥇</div>
              <div className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-2">
                {topParticipants[0]?.name}
              </div>
              <div className="text-5xl md:text-6xl font-bold text-slate-900">
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
              <div className="bg-slate-700 rounded-2xl p-6 w-64 h-64 flex flex-col items-center justify-center border-4 border-slate-600 shadow-inner">
                <div className="text-6xl mb-2">🥈</div>
                <div className="text-xl md:text-2xl font-bold text-white text-center mb-1">{topParticipants[1]?.name}</div>
                <div className="text-3xl font-bold text-blue-400">{topParticipants[1]?.totalScore}</div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center animate-fade-in">
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl p-8 w-72 h-72 flex flex-col items-center justify-center border-4 border-yellow-500 shadow-lg">
                <div className="text-9xl mb-3">🥇</div>
                <div className="text-4xl font-bold text-slate-900 text-center mb-2">{topParticipants[0]?.name}</div>
                <div className="text-5xl font-bold text-slate-900">{topParticipants[0]?.totalScore}</div>
              </div>
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
                className={`flex flex-col items-center animate-fade-in ${isFirst ? 'md:col-span-2 lg:col-span-1' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`rounded-3xl p-4 w-full flex flex-col items-center justify-between border-4 shadow-xl ${
                    isFirst
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-500 h-72'
                      : isTop3
                      ? 'bg-slate-700 border-slate-600 h-56'
                      : 'bg-slate-800 border-slate-700 h-48'
                  }`}
                >
                  <div className={`${isFirst ? 'text-9xl' : isTop3 ? 'text-7xl' : 'text-5xl'} mb-3`}>{medal || `#${index + 1}`}</div>
                    <div className={`${isFirst ? 'text-4xl' : 'text-3xl'} font-bold ${isFirst ? 'text-slate-900' : 'text-white'} text-center`}>{participant.name}</div>
                    <div className={`${isFirst ? 'text-5xl' : 'text-4xl'} font-bold ${isFirst ? 'text-slate-900' : 'text-blue-400'}`}>{participant.totalScore}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, var(--brand-primary, #0f172a), var(--brand-secondary, #0b1220) 50%, var(--brand-accent, #05203a))' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col items-center md:flex-row md:justify-between gap-6">
        <div className="flex items-center gap-6">
          {event.logoUrl && (
            <div className="w-28 h-28 rounded-lg overflow-hidden border-2 border-white/20 bg-white/5 flex-shrink-0">
              <img src={event.logoUrl} alt={`${event.name} logo`} className="w-full h-full object-contain" />
            </div>
          )}
          <div className="text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">{event.name}</h1>
            <p className="text-lg text-slate-200">{event.organization.name}</p>

            {/* Small view tabs inside header (left-aligned, compact) */}
            <div className="mt-3 md:mt-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setViewMode('podium')
                    setCurrentPage(1)
                  }}
                  className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                    viewMode === 'podium' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🏆
                </button>
                <button
                  onClick={() => {
                    setViewMode('full')
                    setParticipantsPerPage(50)
                    setCurrentPage(1)
                  }}
                  className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                    viewMode === 'full' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  📊
                </button>
                <button
                  onClick={() => setFullscreenLeaderboard(v => !v)}
                  title="Toggle fullscreen leaderboard"
                  className="px-2 py-1 text-xs rounded-md font-medium text-slate-300 hover:text-white"
                >
                  ⛶
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Top compact active-round summary removed per request */}
      </div>

      {/* Removed top rounds strip per user request; active rounds are shown as minimized badges */}

      {/* NOTE: View mode tabs moved into header (compact) */}

      {/* Top N Selector (only in podium mode) */}
      {viewMode === 'podium' && (
        <div className="max-w-full mx-auto mb-4 flex justify-start">
          <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2">
            <span className="text-slate-300 px-2">Top</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Page size selector for full views */}
      {viewMode === 'full' && (
        <div className="max-w-full mx-auto mb-6 flex justify-start">
          <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2">
            <span className="text-slate-300 px-2">Page size</span>
            <select
              value={participantsPerPage}
              onChange={(e) => {
                const val = e.target.value
                const v = val === 'all' ? (totalParticipants || 1) : Number(val)
                setParticipantsPerPage(v)
                setCurrentPage(1)
              }}
              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50</option>
              <option value={'all' as any}>All</option>
            </select>
          </div>
        </div>
      )}

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

      {/* Full / All Leaderboard View */}
      {viewMode === 'full' && (
        <div className="max-w-7xl mx-auto">
          {/* Stock-style two-column leaderboard: left 25, right 25 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              const left = paginatedParticipants.slice(0, 25)
              const right = paginatedParticipants.slice(25, 50)
              const renderColumn = (arr: Participant[], side: 'left' | 'right') => (
                <div className="space-y-1">
                  {arr.map((participant, idx) => {
                    const globalIndex = (currentPage - 1) * participantsPerPage + (side === 'left' ? idx : idx + 25)
                    // compute movement by comparing previous index
                    let movement = 0
                    const prev = prevParticipantsRef.current || []
                    const prevIndex = prev.findIndex(p => p.id === participant.id)
                    if (prevIndex !== -1) {
                      movement = prevIndex - globalIndex
                    }
                    const movedUp = movement > 0
                    const movedDown = movement < 0

                    return (
                      <div key={participant.id} className="bg-slate-800/80 backdrop-blur rounded-md px-4 py-3 border border-slate-700 flex items-center justify-between gap-3 text-base transition-transform">
                        <div className="flex items-center gap-3">
                          <div className="text-lg w-10 text-center">{globalIndex < 3 ? (globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : '🥉') : `#${globalIndex + 1}`}</div>
                          <div className="truncate max-w-[18rem]">
                            <div className="text-lg font-bold text-white truncate">{participant.name}</div>
                            <div className="text-sm text-slate-400 truncate">{participant.kind}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-xl font-semibold ${movedUp ? 'text-green-400' : movedDown ? 'text-red-400' : 'text-blue-400'}`}>{participant.totalScore}</div>
                          <div className="w-6 h-6 flex items-center justify-center text-base">
                            {movedUp && <div className="text-green-400 animate-move-up">▲</div>}
                            {movedDown && <div className="text-red-400 animate-move-down">▼</div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )

              return [renderColumn(left, 'left'), renderColumn(right, 'right')]
            })()}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-700 text-white rounded-md"
              >
                Prev
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded-md ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-slate-700 text-white rounded-md"
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

      {/* Fullscreen overlay for a round (5s) */}
      {fullscreenRound !== null && (() => {
        const r = roundsConfig[fullscreenRound]
        const ts = computeTimeLeftFor(fullscreenRound)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-white p-8" onClick={() => setFullscreenRound(null)}>
            <div className="max-w-4xl text-center">
              <div className="text-6xl font-bold mb-4">{r?.name || `Round ${fullscreenRound + 1}`}</div>
              {r?.description && <div className="text-xl text-slate-300 mb-6">{r.description}</div>}
              {ts ? (
                <div className="text-7xl font-mono">{formatMS(ts.left)}</div>
              ) : (
                <div className="text-4xl text-slate-400">No timer</div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Fullscreen leaderboard overlay (user-toggleable) */}
      {fullscreenLeaderboard && (
        <div className="fixed inset-0 z-40 bg-black/95 text-white p-4 overflow-auto" onClick={() => setFullscreenLeaderboard(false)}>
          <div className="max-w-7xl mx-auto relative" onClick={(e) => e.stopPropagation()}>
            {/* floating close button for projector fullscreen */}
            <button
              onClick={() => setFullscreenLeaderboard(false)}
              title="Close fullscreen leaderboard"
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md text-lg"
            >
              ✕
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const left = allParticipants.slice(0, 25)
                const right = allParticipants.slice(25, 50)
                const renderColumn = (arr: Participant[], side: 'left' | 'right') => (
                  <div className="space-y-2">
                    {arr.map((participant, idx) => {
                      const globalIndex = (side === 'left' ? idx : idx + 25)
                      let movement = 0
                      const prev = prevParticipantsRef.current || []
                      const prevIndex = prev.findIndex(p => p.id === participant.id)
                      if (prevIndex !== -1) movement = prevIndex - globalIndex
                      const movedUp = movement > 0
                      const movedDown = movement < 0
                      return (
                                <div key={participant.id} className="bg-slate-900/80 rounded-md px-3 py-2 flex items-center justify-between gap-3 text-base">
                                  <div className="flex items-center gap-3">
                                    <div className="text-base w-9 text-center">{globalIndex < 3 ? (globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : '🥉') : `#${globalIndex + 1}`}</div>
                                    <div className="truncate max-w-[14rem]">
                                      <div className="text-lg font-semibold truncate">{participant.name}</div>
                                      <div className="text-sm text-slate-400 truncate">{participant.kind}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className={`text-lg font-medium ${movedUp ? 'text-green-400' : movedDown ? 'text-red-400' : 'text-blue-300'}`}>{participant.totalScore}</div>
                                    <div className="w-5 h-5 flex items-center justify-center text-sm">
                                      {movedUp && <div className="text-green-400 animate-move-up">▲</div>}
                                      {movedDown && <div className="text-red-400 animate-move-down">▼</div>}
                                    </div>
                                  </div>
                                </div>
                      )
                    })}
                  </div>
                )
                return [renderColumn(left, 'left'), renderColumn(right, 'right')]
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Minimized corner badges (clickable to reopen fullscreen) */}
      {minimizedRounds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          {minimizedRounds.map((idx) => {
            const r = roundsConfig[idx]
            const ts = computeTimeLeftFor(idx)
            return (
              <button
                key={idx}
                onClick={() => showFullscreenFor(idx)}
                title={`${r?.name || `Round ${idx + 1}`}`}
                className="flex items-center gap-3 bg-slate-800/90 text-white px-3 py-2 rounded-lg shadow-lg hover:scale-105"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r?.judgingOpen ? 'bg-green-500' : 'bg-slate-700'}`}>{idx + 1}</div>
                <div className="text-left">
                  <div className="text-sm font-semibold">{r?.name || `Round ${idx + 1}`}</div>
                  <div className="text-xs text-slate-400">{ts ? formatMS(ts.left) : 'No timer'}</div>
                </div>
              </button>
            )
          })}
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
        .animate-move-up {
          animation: moveUp 900ms ease-out;
        }
        .animate-move-down {
          animation: moveDown 900ms ease-out;
        }

        @keyframes moveUp {
          0% { transform: translateY(8px); opacity: 0 }
          60% { transform: translateY(-6px); opacity: 1 }
          100% { transform: translateY(0); opacity: 1 }
        }
        @keyframes moveDown {
          0% { transform: translateY(-8px); opacity: 0 }
          60% { transform: translateY(6px); opacity: 1 }
          100% { transform: translateY(0); opacity: 1 }
        }
      `}</style>
    </div>
  )
}
