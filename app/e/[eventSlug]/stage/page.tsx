'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme'
import { BroadcastTicker } from '@/components/broadcast-ticker'
import { StageCinematics } from '@/components/stage-cinematics'
import { PageLoading } from '@/components/loading-spinner'

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
  features?: any
}

export default function StagePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { role } = useAuth()
  const eventSlug = params.eventSlug as string
  const { setEventColors, useBrandColors, setUseBrandColors } = useTheme()

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [event, setEvent] = useState<Event | null>(null)
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])
  const [completionsMap, setCompletionsMap] = useState<Record<string, Set<number>>>({})
  const [roundsConfig, setRoundsConfig] = useState<any[]>([])
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0)
  const [isTimerExpanded, setIsTimerExpanded] = useState<boolean | null>(null)
  const [fullscreenRound, setFullscreenRound] = useState<number | null>(null)
  const [minimizedRounds, setMinimizedRounds] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'podium' | 'full'>('podium')
  const [topN, setTopN] = useState<number>(3)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [participantsPerPage, setParticipantsPerPage] = useState<number>(() => 50)
  const [totalParticipants, setTotalParticipants] = useState<number>(0)
  const [fullscreenLeaderboard, setFullscreenLeaderboard] = useState(false)
  const [roundSplash, setRoundSplash] = useState<{ number: number; name: string } | null>(null)
  const [confettiActive, setConfettiActive] = useState(false)

  const prevParticipantsRef = useRef<Participant[] | null>(null)
  const allParticipantsRef = useRef<Participant[]>([])
  const prevTopOneId = useRef<string | null>(null)
  const prevRoundIdxRef = useRef<number>(0)

  // Access control: Only admins can access Stage Display
  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated' || (status === 'authenticated' && role !== 'admin')) {
      router.replace(`/e/${eventSlug}`)
      return
    }
  }, [status, role, eventSlug, router])

  useEffect(() => {
    if (event?.features?.isEnded) {
      setViewMode('podium')
      if (topN !== 3) setTopN(3) 
      setConfettiActive(true)
    }
  }, [event?.features?.isEnded, topN])

  // Refs for detecting transitions and timers - MUST be before any conditional returns
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
    // threshold from event.features.timerCollapseThresholdMinutes (minutes)
    const threshold = (event.features?.timerCollapseThresholdMinutes) ?? (event.rules?.features?.timerCollapseThresholdMinutes) ?? 1
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
        } catch { }
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
        } catch { }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }

  // keep a ref synced with latest participants for delta calculations
  useEffect(() => {
    if (allParticipants.length > 0) {
      const topOne = allParticipants[0]
      if (prevTopOneId.current && prevTopOneId.current !== topOne.id) {
        // RANK #1 CHANGED! 
        setConfettiActive(true)
        setTimeout(() => setConfettiActive(false), 5000)

        // play sound if enabled (future enhancement)
        console.log('RANK 1 CHANGE DETECTED: ', topOne.name)
      }
      prevTopOneId.current = topOne.id
    }
    allParticipantsRef.current = allParticipants
  }, [allParticipants])

  // Timer toggle function for keyboard shortcut
  const toggleTimer = async () => {
    const currentRound = roundsConfig[currentRoundIdx] || null
    if (!currentRound) return
    
    const isPaused = currentRound.timerPausedAt && !currentRound.timerRunning
    const isRunning = currentRound.timerRunning || (currentRound.timerStartedAt && !currentRound.timerPausedAt)
    
    try {
      let action: string
      if (isRunning) {
        action = 'pause'
      } else if (isPaused) {
        action = 'resume'
      } else {
        action = 'start'
      }
      
      await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          eventSlug,
          roundNumber: currentRoundIdx
        })
      })
    } catch (e) {
      console.error('Failed to toggle timer:', e)
    }
  }

  // Keyboard Shortcuts: Space (Play/Pause), F (Fullscreen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape' && fullscreenLeaderboard) {
        setFullscreenLeaderboard(false)
      }

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setFullscreenLeaderboard(prev => !prev)
      }

      if (e.key === ' ') {
        e.preventDefault()
        toggleTimer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreenLeaderboard, roundsConfig, currentRoundIdx, eventSlug])

  const setupSSE = () => {
    const eventSource = new EventSource(`/api/sse?eventSlug=${eventSlug}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'leaderboard-update' || data.type === 'leaderboard' || data.type === 'snapshot') {
          // If we are in podium mode or on page 1, we can use the data directly if it's top-N
          if (data.leaderboard && Array.isArray(data.leaderboard)) {
            // For Stage view, we usually care about the top participants.
            // If the incoming data is the full top pool, update our local state to avoid a fetch.
            setAllParticipants(data.leaderboard)
            setTotalParticipants(data.leaderboard.length)
          } else {
            // fallback: refetch current page to keep server-side pagination consistent
            fetchLeaderboard(currentPage, participantsPerPage)
          }
        }
        if (data.type === 'round-change') {
          // payload: { currentRound, roundsConfig }
          if (typeof data.currentRound === 'number') {
            if (data.currentRound !== prevRoundIdxRef.current) {
              // Round started!
              const r = data.roundsConfig?.[data.currentRound]
              if (r) {
                setRoundSplash({ number: data.currentRound + 1, name: r.name })
                playRoundSound()
                setTimeout(() => setRoundSplash(null), 5000)
              }
            }
            setCurrentRoundIdx(data.currentRound)
            prevRoundIdxRef.current = data.currentRound
          }
          if (Array.isArray(data.roundsConfig)) setRoundsConfig(data.roundsConfig)
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error)
      }
    }

    return () => eventSource.close()
  }

  // Initial data loading - fetch leaderboard and setup SSE
  useEffect(() => {
    fetchLeaderboard()
    const cleanupSse = setupSSE()
    return () => {
      if (typeof cleanupSse === 'function') cleanupSse()
      setEventColors(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug])

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
    if (!startedAt) return { total, left: total, running: !!round.timerRunning, paused: false }
    
    // Handle paused state
    const pausedAt = round.timerPausedAt ? new Date(round.timerPausedAt).getTime() : null
    if (pausedAt) {
      // Timer is paused - calculate time left at pause time
      const elapsed = Math.floor((pausedAt - startedAt) / 1000)
      const left = Math.max(0, total - elapsed)
      return { total, left, running: false, paused: true }
    }
    
    // Timer is running
    const now = Date.now()
    const elapsed = Math.floor((now - startedAt) / 1000)
    const left = Math.max(0, total - elapsed)
    return { total, left, running: left > 0 && !!round.timerRunning, paused: false }
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

  // Audio Feedback for Timer End - with proper cleanup
  const timerEndAudioRef = useRef<HTMLAudioElement | null>(null)
  const prevTimerLeftRef = useRef<number | null>(null)
  
  useEffect(() => {
    // Only play when timer just hit 0 (not on initial load or re-renders)
    const justFinished = prevTimerLeftRef.current !== null && 
                         prevTimerLeftRef.current > 0 && 
                         timerState?.left === 0
    
    if (justFinished) {
      try {
        // Clean up any existing audio
        if (timerEndAudioRef.current) {
          timerEndAudioRef.current.pause()
          timerEndAudioRef.current.src = ''
        }
        
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1063/1063-preview.mp3')
        audio.volume = 0.3
        timerEndAudioRef.current = audio
        audio.play().catch(() => {})
      } catch (e) {
        console.warn('Failed to play timer end sound:', e)
      }
    }
    
    prevTimerLeftRef.current = timerState?.left ?? null
    
    // Cleanup on unmount
    return () => {
      if (timerEndAudioRef.current) {
        timerEndAudioRef.current.pause()
        timerEndAudioRef.current.src = ''
        timerEndAudioRef.current = null
      }
    }
  }, [timerState?.left])

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

  // Simple synthesized Gong/Bong sound
  const playRoundSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(110, ctx.currentTime) // low A
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.5)

      gain.gain.setValueAtTime(0.5, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 2)
    } catch (e) { }
  }

  // ============ CONDITIONAL RETURNS (after all hooks) ============
  // Show loading while checking authentication
  if (status === 'loading') {
    return <PageLoading message="Verifying Access..." />
  }

  // Show access denied if not admin
  if (status === 'authenticated' && role !== 'admin') {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 p-12 rounded-2xl text-center space-y-6 max-w-md">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold text-white">Admin Access Required</h2>
            <p className="text-white/80">The Stage Display is only accessible to event administrators.</p>
          </div>
          <button
            onClick={() => router.push(`/e/${eventSlug}`)}
            className="w-full py-3 bg-cream text-charcoal rounded-full font-medium hover:bg-white transition-colors"
          >
            Go to Standings
          </button>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/10 border-t-white/60 rounded-full animate-spin"></div>
          <div className="text-white/80 text-sm font-medium">Loading stage...</div>
        </div>
      </div>
    )
  }


  /* --- ULTRA PREMIUM PODIUM RENDERER --- */
  const renderPodium = () => {
    if (topParticipants.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 animate-fade-in">
          <div className="text-6xl mb-4 opacity-20">🏆</div>
          <div className="text-xl font-light tracking-widest uppercase">Waiting for champions</div>
        </div>
      )
    }

    // Dynamic metallic text classes - refined for minimalism
    const goldText = "text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
    const silverText = "text-slate-300 drop-shadow-[0_0_15px_rgba(148,163,184,0.3)]"
    const bronzeText = "text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]"

    // Helper for cards
    const PodiumCard = ({ p, rank, delay }: { p: Participant; rank: number; delay: number }) => {
      const isFirst = rank === 0
      const isSecond = rank === 1
      const isThird = rank === 2

      const themeClass = isFirst ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_50px_-10px_rgba(245,158,11,0.2)]" :
        isSecond ? "border-slate-400/30 bg-slate-400/5 shadow-[0_0_30px_-10px_rgba(148,163,184,0.1)]" :
          isThird ? "border-orange-500/30 bg-orange-500/5 shadow-[0_0_30px_-10px_rgba(249,115,22,0.1)]" :
            "border-white/10 bg-white/5"

      const medalEmoji = isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : `#${rank + 1}`
      const heightClass = isFirst ? "h-[500px]" : isSecond ? "h-[420px]" : "h-[380px]"

      return (
        <div
          className={`relative group flex flex-col items-center animate-fade-in-up`}
          style={{ animationDelay: `${delay}ms` }}
        >
          {/* Rank Badge Floating Above */}
          <div className={`
             absolute -top-12 text-6xl md:text-8xl select-none transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl
             ${isFirst ? "z-20 scale-110" : "z-10"}
          `}>
            {medalEmoji}
          </div>

          {/* The Monolith Card */}
          <div className={`
            ${heightClass} w-full max-w-[280px] rounded-[2rem] 
            border-t border-l border-r border-b-0
            backdrop-blur-2xl flex flex-col items-center justify-end pb-8
            transition-all duration-700 hover:-translate-y-2
            ${themeClass}
          `}>
            {/* Inner content */}
            <div className="text-center px-4 space-y-4 mb-auto pt-24 w-full">
              <div className="space-y-1">
                <div className={`text-4xl md:text-5xl font-mono font-bold tracking-tight ${isFirst ? goldText : isSecond ? silverText : isThird ? bronzeText : 'text-slate-300'}`}>
                  {p.totalScore}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/30">Score</div>
              </div>

              <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />

              <div>
                <div className="font-display text-xl md:text-2xl font-semibold text-white line-clamp-2 leading-tight">
                  {p.name}
                </div>
                <div className="text-xs text-white/30 mt-1 uppercase tracking-wider">
                  {p.kind}
                </div>
              </div>
            </div>

            {/* Bottom Glow */}
            <div className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t ${isFirst ? 'from-amber-500/20' : isSecond ? 'from-slate-400/20' : 'from-orange-500/20'} to-transparent rounded-b-[2rem] pointer-events-none`} />
          </div>
        </div>
      )
    }

    // Top 3 Layout
    if (topParticipants.length <= 3) {
      return (
        <div className="flex items-end justify-center gap-4 md:gap-12 mt-20 perspective-1000">
          {topParticipants[1] && <PodiumCard p={topParticipants[1]} rank={1} delay={200} />}
          {topParticipants[0] && <PodiumCard p={topParticipants[0]} rank={0} delay={0} />}
          {topParticipants[2] && <PodiumCard p={topParticipants[2]} rank={2} delay={400} />}
        </div>
      )
    }

    // Grid Layout for many winners
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
        {topParticipants.map((p, i) => (
          <div key={p.id} className="flex justify-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full flex flex-col items-center backdrop-blur-md transition-all hover:bg-white/10">
              <div className="text-4xl mb-3">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
              <div className="text-3xl font-bold text-white mb-2">{p.totalScore}</div>
              <div className="text-lg text-slate-300 font-medium">{p.name}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 relative">
      <BroadcastTicker />
      <StageCinematics />
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-charcoal overflow-hidden">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-aurora-1 opacity-20"
          style={{ backgroundColor: event?.brandColors?.primary || '#4f46e5' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-aurora-2 opacity-20"
          style={{ backgroundColor: event?.brandColors?.secondary || '#8b5cf6' }}
        />
        <div
          className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[80%] h-[80%] rounded-full blur-[200px] animate-pulse-slow opacity-10"
          style={{ backgroundColor: event?.brandColors?.accent || '#10b981' }}
        />
        {/* Subtle grid mesh */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Header */}
      <div className="mb-12 flex flex-col items-center md:flex-row md:justify-between gap-6 relative z-10">
        <div className="flex items-center gap-5">
          {event.logoUrl && (
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur shadow-2xl transition-transform hover:scale-105">
              <img src={event.logoUrl} alt={`${event.name} logo`} className="w-full h-full object-contain p-2" />
            </div>
          )}
          <div className="text-center md:text-left">
            {event.features?.isEnded ? (
              <div className="animate-fade-in">
                <div className="text-emerald-400 font-mono tracking-widest text-xs uppercase mb-2">Event Complete</div>
                <h1 className="font-display text-5xl md:text-7xl font-semibold text-white mb-2 tracking-tight">
                  Final Results
                </h1>
                <p className="text-lg text-white/40 tracking-wide">{event.name}</p>
              </div>
            ) : (
              <>
                <h1 className="font-display text-5xl md:text-6xl font-semibold text-white mb-1 tracking-tight">{event.name}</h1>
                <p className="text-sm text-white/40 uppercase tracking-widest">{event.organization.name}</p>
              </>
            )}

            {/* Small view tabs inside header (left-aligned, compact) */}
            <div className="mt-3 md:mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setViewMode('podium')
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${viewMode === 'podium' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                    }`}
                >
                  CHAMPIONS
                </button>
                <button
                  onClick={() => {
                    setViewMode('full')
                    setParticipantsPerPage(50)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${viewMode === 'full' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                    }`}
                >
                  STANDINGS
                </button>
                <button
                  onClick={() => setFullscreenLeaderboard(v => !v)}
                  title="Toggle fullscreen leaderboard"
                  className="px-3 py-1.5 text-xs rounded-full font-medium text-slate-400 hover:text-white bg-white/5 border border-white/5 transition-all hover:bg-white/10"
                >
                  Full Screen
                </button>
                {/* Brand Color Toggle */}
                {event.brandColors && (
                  <button
                    onClick={() => setUseBrandColors(!useBrandColors)}
                    title={useBrandColors ? 'Using brand colors' : 'Using default theme'}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all flex items-center gap-1.5 ${
                      useBrandColors 
                        ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-purple-500/20' 
                        : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: event.brandColors.primary }} />
                    {useBrandColors ? 'BRAND' : 'DEFAULT'}
                  </button>
                )}
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
          <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 flex items-center gap-3 rounded-full shadow-lg">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Top Count</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-2 py-1 bg-transparent border-none text-white text-sm font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 8, 12, 16].map(n => (
                <option key={n} value={n} className="bg-slate-800 text-white">
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
          <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 flex items-center gap-3 rounded-full shadow-lg">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">View Size</span>
            <select
              value={participantsPerPage}
              onChange={(e) => {
                const val = e.target.value
                const v = val === 'all' ? (totalParticipants || 1) : Number(val)
                setParticipantsPerPage(v)
                setCurrentPage(1)
              }}
              className="bg-transparent border-none text-white text-sm font-bold focus:outline-none cursor-pointer"
            >
              <option value={50} className="bg-slate-800">50</option>
              <option value={'all' as any} className="bg-slate-800">All</option>
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
            className="w-full bg-white/5 border border-white/10 rounded-full px-8 py-4 text-lg text-white placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all shadow-inner"
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
                <div className="space-y-0.5">
                  {arr.map((participant, idx) => {
                    const globalIndex = (currentPage - 1) * participantsPerPage + (side === 'left' ? idx : idx + 25)
                    let movement = 0
                    const prev = prevParticipantsRef.current || []
                    const prevIndex = prev.findIndex(p => p.id === participant.id)
                    if (prevIndex !== -1) {
                      movement = prevIndex - globalIndex
                    }
                    const movedUp = movement > 0
                    const movedDown = movement < 0

                    return (
                      <div key={participant.id} className="group relative px-6 py-3 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0 overflow-hidden">
                        <div className="flex items-center gap-6">
                          <div className={`text-xl w-10 text-center font-bold font-mono ${globalIndex < 3 ? 'text-white' : 'text-slate-500 opacity-50'}`}>
                            {globalIndex === 0 ? '01' : globalIndex === 1 ? '02' : globalIndex === 2 ? '03' : (globalIndex + 1).toString().padStart(2, '0')}
                          </div>
                          <div className="truncate max-w-[18rem]">
                            <div className="text-lg font-medium text-white/90 tracking-tight group-hover:text-white transition-colors uppercase">{participant.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-bold tracking-tighter uppercase">{participant.kind === 'team' ? 'TEAM' : 'INDIV'}</span>
                              {movedUp && <span className="text-[10px] text-emerald-500/80 font-bold">▲ {movement}</span>}
                              {movedDown && <span className="text-[10px] text-rose-500/80 font-bold">▼ {Math.abs(movement)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-black tabular-nums tracking-tighter ${movedUp ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : movedDown ? 'text-rose-400' : 'text-white'}`}>
                            {(participant.totalScore ?? 0).toLocaleString()}
                          </div>
                          <div className={`w-1 h-8 rounded-full transition-all ${movedUp ? 'bg-emerald-500 scale-y-100' : movedDown ? 'bg-rose-500 scale-y-100' : 'bg-white/5'}`} />
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
                  <div className="space-y-0.5">
                    {arr.map((participant, idx) => {
                      const globalIndex = (side === 'left' ? idx : idx + 25)
                      let movement = 0
                      const prev = prevParticipantsRef.current || []
                      const prevIndex = prev.findIndex(p => p.id === participant.id)
                      if (prevIndex !== -1) movement = prevIndex - globalIndex
                      const movedUp = movement > 0
                      const movedDown = movement < 0
                      return (
                        <div key={participant.id} className="group relative px-4 py-2 flex items-center justify-between gap-4 transition-all border-b border-white/[0.03] last:border-0 overflow-hidden">
                          <div className="flex items-center gap-4">
                            <div className={`text-sm w-8 text-center font-bold font-mono ${globalIndex < 3 ? 'text-white' : 'text-slate-500 opacity-40'}`}>
                              {(globalIndex + 1).toString().padStart(2, '0')}
                            </div>
                            <div className="truncate max-w-[14rem]">
                              <div className="text-base font-medium text-white/90 tracking-tight group-hover:text-white transition-colors uppercase truncate">{participant.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-slate-500 font-bold tracking-tighter uppercase">{participant.kind === 'team' ? 'TEAM' : 'INDIV'}</span>
                                {movedUp && <span className="text-[9px] text-emerald-500/80 font-bold">▲ {movement}</span>}
                                {movedDown && <span className="text-[9px] text-rose-500/80 font-bold">▼ {Math.abs(movement)}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`text-xl font-black tabular-nums tracking-tighter ${movedUp ? 'text-emerald-400' : movedDown ? 'text-rose-400' : 'text-white'}`}>
                              {(participant.totalScore ?? 0).toLocaleString()}
                            </div>
                            <div className={`w-1 h-6 rounded-full transition-all ${movedUp ? 'bg-emerald-500' : movedDown ? 'bg-rose-500' : 'bg-white/5'}`} />
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
        <div className="fixed bottom-8 right-8 z-40 flex flex-nowrap items-center gap-3 animate-fade-in-up">
          <div className="flex items-center gap-2 p-2 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl">
            {minimizedRounds.map((idx) => {
              const r = roundsConfig[idx]
              const ts = computeTimeLeftFor(idx)
              const isActive = idx === currentRoundIdx
              const isLowTime = ts && ts.left < 60 && r?.timerRunning

              return (
                <button
                  key={idx}
                  onClick={() => showFullscreenFor(idx)}
                  className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 overflow-hidden group ${isActive
                    ? 'bg-white/10 shadow-[inner_0_0_20px_rgba(255,255,255,0.05)]'
                    : 'hover:bg-white/5'
                    }`}
                >
                  {/* Subtle active glow */}
                  {isActive && (
                    <div
                      className="absolute inset-0 opacity-20 blur-xl animate-pulse-slow"
                      style={{ backgroundColor: event?.brandColors?.primary || '#4f46e5' }}
                    />
                  )}

                  <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${isActive ? 'bg-white text-black' : 'bg-white/10 text-slate-400'
                    }`}>
                    {idx + 1}
                  </div>

                  <div className="relative text-left flex flex-col justify-center">
                    <div className={`text-[10px] uppercase tracking-[0.2em] font-bold leading-none mb-1 transition-colors ${isActive ? 'text-white' : 'text-slate-500'
                      }`}>
                      {r?.name || `Round ${idx + 1}`}
                    </div>
                    <div className={`text-sm font-mono font-bold leading-none tabular-nums flex items-center gap-1.5 ${isLowTime ? 'text-red-500 animate-pulse' :
                      isActive ? 'text-blue-400' :
                        'text-slate-300'
                      }`}>
                      {ts ? formatMS(ts.left) : '00:00'}
                      {r?.timerRunning && !isLowTime && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Glass highlight line */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Round Start Splash Overlay */}
      {roundSplash && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="text-center space-y-4 transform animate-bounce-in">
            <div className="text-blue-500 font-mono tracking-[0.5em] text-2xl uppercase">Round {roundSplash.number}</div>
            <h2 className="text-7xl md:text-9xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
              {roundSplash.name}
            </h2>
            <div className="text-white/40 text-xl font-light tracking-widest uppercase mt-8 animate-pulse">Starting Now</div>
          </div>
        </div>
      )}

      {/* Confetti Overlay */}
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {/* Simple CSS Confetti Particles */}
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                backgroundColor: ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear infinite;
        }
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
        @keyframes aurora-1 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
          50% { transform: translate(10%, 5%) rotate(5deg); opacity: 0.5; }
          100% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
        }
        @keyframes aurora-2 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
          50% { transform: translate(-10%, -5%) rotate(-5deg); opacity: 0.5; }
          100% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
        }
        .animate-aurora-1 { animation: aurora-1 20s infinite ease-in-out; }
        .animate-aurora-2 { animation: aurora-2 25s infinite ease-in-out; }
        .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        
        @keyframes fade-in-up {
           from { opacity: 0; transform: translateY(30px); }
           to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.5); }
        }
        .animate-pulse-red { animation: pulse-red 1s infinite ease-in-out; }
      `}</style>
    </div>
  )
}
