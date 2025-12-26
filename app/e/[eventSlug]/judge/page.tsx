'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { EventNavigation } from '@/components/event-navigation'
import { EventCache } from '@/lib/cache'
import { useAuth } from '@/lib/auth-context'

interface Participant {
  id: string
  name: string
  kind: string
}

interface Criterion {
  name: string
  maxPoints: number
  weight: number
  description: string
}

interface Event {
  id: string
  name: string
  slug: string
  rules: {
    rubric: Criterion[]
    rounds?: any[]
  }
  currentRound?: number
}

interface Round {
  name: string
  judgingOpen: boolean
  judgingWindowMinutes?: number | null
  roundDurationMinutes: number
}

export default function JudgeConsolePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { role } = useAuth()
  const eventSlug = params.eventSlug as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [selectedCompleted, setSelectedCompleted] = useState<boolean>(false)
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number>(1)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [completedParticipants, setCompletedParticipants] = useState<Set<string>>(new Set())


  const cache = EventCache.getInstance()

  useEffect(() => {
    // Block admin access to judge console unless they registered as a judge
    try {
      const isJudgeFlag = localStorage?.getItem('user-role-judge')
      if (role === 'admin' && isJudgeFlag !== 'true') return
    } catch (e) {
      if (role === 'admin') return
    }

    if (status === 'unauthenticated') {
      router.push(`/judge/access?eventSlug=${eventSlug}`)
      return
    }
    if (status === 'authenticated') {
      fetchJudgeData()
    }
  }, [status, role, eventSlug, router])

  // Listen for server-sent events scoped to this event to keep rounds in sync
  useEffect(() => {
    if (!eventSlug) return
    const es = new EventSource(`/api/sse?eventSlug=${encodeURIComponent(eventSlug)}`)
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload?.type === 'round-change') {
          const incomingRounds = Array.isArray(payload.roundsConfig) ? payload.roundsConfig : []
          // Normalize incoming rounds shape
          const normalized = incomingRounds.map((r: any) => ({
            ...r,
            judgingOpen: !!r.judgingOpen,
            judgingWindowMinutes: typeof r.judgingWindowMinutes === 'number' ? r.judgingWindowMinutes : null,
            roundDurationMinutes: r.roundDurationMinutes ?? r.duration ?? null,
            judgingOpenedAt: r.judgingOpenedAt ?? null,
          }))
          setRounds(normalized)
          if (typeof payload.currentRound === 'number') {
            setSelectedRoundNumber((payload.currentRound ?? 0) + 1)
          }
        }
      } catch (e) {
        // ignore malformed SSE data
      }
    }
    es.onerror = () => {
      try { es.close() } catch { }
    }
    return () => es.close()
  }, [eventSlug])

  // Subscribe to SSE for real-time round updates scoped to this event
  useEffect(() => {
    if (!eventSlug) return
    const es = new EventSource(`/api/sse?eventSlug=${encodeURIComponent(eventSlug)}`)
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload?.type === 'round-change') {
          if (Array.isArray(payload.roundsConfig)) {
            setRounds(payload.roundsConfig)
          }
          if (typeof payload.currentRound === 'number') {
            // update selected round to the activated round
            setSelectedRoundNumber(payload.currentRound + 1)
          }
        }
      } catch (err) {
        // ignore parse errors
      }
    }
    es.onerror = () => {
      try { es.close() } catch { }
    }
    return () => es.close()
  }, [eventSlug])

  // Listen for rubric updates (scoring-schema) and reload rubric live
  useEffect(() => {
    if (!eventSlug) return
    const es = new EventSource(`/api/sse?eventSlug=${encodeURIComponent(eventSlug)}`)
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload?.type === 'scoring-schema') {
          // fetch latest scoring schema and update event.rules.rubric
          fetch(`/api/scoring-schema?eventSlug=${encodeURIComponent(eventSlug)}`)
            .then(r => r.ok ? r.json() : Promise.reject(r))
            .then((d) => {
              const latest = d.rubric || []
              setEvent(prev => prev ? { ...prev, rules: { ...(prev.rules || {}), rubric: latest } } : prev)
              // reinitialize scores for current displayRubric
              const normalized = (latest || []).map((r: any) => ({
                key: r.key ?? r.name,
                label: r.label ?? r.name,
                maxPoints: Number(r.max ?? r.maxPoints ?? 100),
                weight: Number(r.weight ?? 1),
                description: r.description ?? '',
                rounds: Array.isArray(r.rounds) ? r.rounds.map((v: any) => Number(v)) : null,
              }))
              const visible = normalized.filter((c: any) => !c.rounds || c.rounds.includes(selectedRoundNumber))
              const initialScores: Record<string, number> = {}
              visible.forEach((c: any) => { initialScores[c.key] = scores[c.key] ?? 0 })
              setScores(initialScores)
              try { toast('Rubric updated', { icon: '🔁' }) } catch { }
            })
            .catch(() => { })
        }
      } catch (err) { }
    }
    es.onerror = () => { try { es.close() } catch { } }
    return () => es.close()
  }, [eventSlug, selectedRoundNumber])

  const fetchJudgeData = async () => {
    // Try cache first
    const cacheKey = `judge_data_${eventSlug}`
    const cached = cache.get(cacheKey)

    if (cached) {
      setEvent(cached.event)
      setParticipants(cached.participants)
      const initialScores: Record<string, number> = {}
      cached.event.rules?.rubric?.forEach((criterion: any) => {
        initialScores[criterion.key || criterion.name || 'unknown'] = 0
      })
      setScores(initialScores)
      // set selected round to current round from cache
      setSelectedRoundNumber((cached.event.currentRound ?? 0) + 1)
      setLoading(false)
    }

    try {
      const [eventRes, participantsRes, roundsRes] = await Promise.all([
        fetch(`/api/events/${eventSlug}`),
        fetch(`/api/events/${eventSlug}/participants`),
        fetch(`/api/rounds?eventSlug=${eventSlug}`)
      ])

      let eventData: any = null

      if (eventRes.ok) {
        eventData = await eventRes.json()
        setEvent(eventData.event)

        // Initialize scores with 0
        const initialScores: Record<string, number> = {}
        eventData.event.rules?.rubric?.forEach((criterion: any) => {
          initialScores[criterion.key || criterion.name || 'unknown'] = 0
        })
        setScores(initialScores)

        if (participantsRes.ok) {
          const participantsData = await participantsRes.json()
          setParticipants(participantsData.participants)

          // Cache the data
          cache.set(cacheKey, {
            event: eventData.event,
            participants: participantsData.participants
          }, 2 * 60 * 1000)
          // ensure selected round reflects currentRound
          setSelectedRoundNumber((eventData.event.currentRound ?? 0) + 1)
        }
        if (roundsRes.ok) {
          const roundsData = await roundsRes.json()
          const fetchedRounds = roundsData.rounds || []
          setRounds(fetchedRounds)

          // Auto-select first open round if none selected
          if (fetchedRounds.length > 0 && !selectedRoundNumber) {
            const firstOpenRound = fetchedRounds.findIndex((r: Round) => r.judgingOpen)
            if (firstOpenRound >= 0) {
              setSelectedRoundNumber(firstOpenRound + 1)
            }
          }
        }
      }

      // Fetch completion status for all participants in the selected round
      const fetchCompletions = async () => {
        try {
          const res = await fetch(`/api/events/${eventSlug}/round-completions?roundNumber=${selectedRoundNumber}`)
          if (res.ok) {
            const data = await res.json()
            const completed = new Set<string>()
            if (Array.isArray(data.rows)) {
              data.rows.forEach((r: any) => {
                if (r.participantId) completed.add(r.participantId)
              })
            }
            setCompletedParticipants(completed)
          }
        } catch (e) {
          console.error('Failed to fetch completions', e)
        }
      }

      // Fetch completions when round changes
      if (eventData?.event) {
        fetchCompletions()
      }
    } catch (error) {
      console.error('Failed to fetch judge data:', error)
      toast.error('Failed to load judging data')
    } finally {
      setLoading(false)
    }
  }

  // Per-criterion feedback inputs removed; use centralized Comments box below

  const handleScoreChange = (criterionName: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [criterionName]: value
    }))
  }

  const handleSubmit = async () => {
    if (!selectedParticipant) {
      toast.error('Please select a participant')
      return
    }

    if (selectedCompleted) {
      toast.error('Participant already completed this round')
      return
    }

    // Check if judging is open for this round
    const currentRound = rounds[selectedRoundNumber - 1]
    if (!currentRound?.judgingOpen) {
      toast.error('Judging is not open for this round')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/judge/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug,
          participantId: selectedParticipant,
          scores,
          comment,
          roundNumber: selectedRoundNumber,
        })
      })

      if (response.ok) {
        // play subtle success sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3') // subtle "ding"
          audio.volume = 0.2
          audio.play().catch(() => { })
        } catch (e) { }

        toast.success('Scores submitted successfully!')
        setScores({})
        setComment('')
        // Mark participant as completed for this round
        if (selectedParticipant) {
          setCompletedParticipants(prev => new Set([...prev, selectedParticipant]))
          setSelectedCompleted(true)
        }
        setSelectedParticipant(null)
        // Re-initialize scores
        event?.rules?.rubric?.forEach((criterion: any) => {
          setScores(prev => ({ ...prev, [criterion.key || criterion.name || 'unknown']: 0 }))
        })
      } else {
        const error = await response.json()
        const errorMessage = error.message || error.error || 'Failed to submit scores'
        toast.error(errorMessage)

        // If round already completed error, refresh completion status
        if (error.error === 'round_already_completed') {
          if (selectedParticipant) {
            setCompletedParticipants(prev => new Set([...prev, selectedParticipant]))
            setSelectedCompleted(true)
          }
        }
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  // Normalize rubric shape (support older/newer schema shapes)
  const rawRubric = event?.rules?.rubric || []
  const rubric = rawRubric.map((r: any) => ({
    key: r.key ?? r.name ?? (r.label ? r.label.toLowerCase().replace(/\s+/g, '_') : Math.random().toString(36).slice(2, 8)),
    label: r.label ?? r.name ?? r.key ?? 'Criterion',
    maxPoints: Number(r.max ?? r.maxPoints ?? 100),
    weight: Number(r.weight ?? 1),
    description: r.description ?? '',
    rounds: Array.isArray(r.rounds) ? r.rounds.map((v: any) => Number(v)) : null,
    scale: r.scale ?? (r.type === 'range' ? 'range' : 'number')
  }))
  const roundsConfig = rounds
  const currentRoundNumber = (event?.currentRound ?? 0) + 1
  const displayRubric = rubric.filter((c) => !c.rounds || c.rounds.includes(selectedRoundNumber))

  const totalPossibleScore = displayRubric.reduce((sum, c) => sum + (c.maxPoints || 0), 0)
  const currentTotal = Object.values(scores).reduce((sum, s) => sum + s, 0)

  useEffect(() => {
    if (!event) return
    // initialize scores for the currently selected round's rubric
    const initial: Record<string, number> = {}
    displayRubric.forEach((c) => {
      initial[c.key] = scores[c.key] ?? 0
    })
    setScores(initial)

    // Fetch completion status for all participants when round changes
    if (eventSlug && selectedRoundNumber) {
      fetch(`/api/events/${eventSlug}/round-completions?roundNumber=${selectedRoundNumber}`)
        .then(r => r.json())
        .then(data => {
          const completed = new Set<string>()
          if (Array.isArray(data.rows)) {
            data.rows.forEach((r: any) => {
              if (r.participantId) completed.add(r.participantId)
            })
          }
          setCompletedParticipants(completed)
        })
        .catch(() => { })
    }

    // Clear selected participant when round changes
    setSelectedParticipant(null)
    setSelectedCompleted(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoundNumber, event?.rules?.rubric?.length])

  // Watch selected participant to fetch its completion status
  useEffect(() => {
    if (!selectedParticipant) {
      setSelectedCompleted(false)
      return
    }
    // Check if participant is in completed set
    if (completedParticipants.has(selectedParticipant)) {
      setSelectedCompleted(true)
      return
    }
    // Also fetch from API to be sure
    fetch(`/api/judge/score?participantId=${selectedParticipant}&roundNumber=${selectedRoundNumber}`)
      .then(r => r.json())
      .then(d => {
        setSelectedCompleted(!!d.completedCurrentRound)
      })
      .catch(() => { })
  }, [selectedParticipant, selectedRoundNumber, completedParticipants])

  // Filter participants by search query
  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.kind.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedParticipantData = participants.find(p => p.id === selectedParticipant)

  // Block admin access
  try {
    const isJudgeFlag = localStorage?.getItem('user-role-judge')
    if (role === 'admin' && isJudgeFlag !== 'true') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚖️</div>
            <h1 className="text-2xl font-bold text-white mb-2">Judge Console Access Restricted</h1>
            <p className="text-slate-400 mb-4">
              The judge console is only available to judges. Admins should use the admin dashboard to manage events.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Link
                href={`/e/${eventSlug}/admin`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Admin Dashboard
              </Link>
              <Link
                href={`/e/${eventSlug}`}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      )
    }
  } catch (e) {
    if (role === 'admin') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚖️</div>
            <h1 className="text-2xl font-bold text-white mb-2">Judge Console Access Restricted</h1>
            <p className="text-slate-400 mb-4">
              The judge console is only available to judges. Admins should use the admin dashboard to manage events.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Link
                href={`/e/${eventSlug}/admin`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Admin Dashboard
              </Link>
              <Link
                href={`/e/${eventSlug}`}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      )
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading judge console...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">You don't have permission to judge this event.</p>
          <Link href={`/e/${eventSlug}`} className="text-blue-400 hover:text-blue-300">
            Back to Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <EventNavigation />

      {/* Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push(`/e/${eventSlug}/admin`)}
                className="text-slate-400 hover:text-white mb-2 flex items-center gap-2 text-sm"
              >
                ← Back to Admin
              </button>
              <h1 className="text-2xl font-bold text-white">⚖️ Judge Console</h1>
              <p className="text-slate-400 text-sm">{event.name}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-semibold">
                  Round {selectedRoundNumber}{rounds.length ? ` / ${rounds.length}` : ''}
                </span>
                {selectedRoundNumber > 0 && rounds[selectedRoundNumber - 1] && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rounds[selectedRoundNumber - 1].judgingOpen
                    ? 'bg-green-500/10 border border-green-500/30 text-green-200'
                    : 'bg-red-500/10 border border-red-500/30 text-red-200'
                    }`}>
                    {rounds[selectedRoundNumber - 1].judgingOpen ? '🟢 Judging Open' : '🔴 Judging Closed'}
                  </span>
                )}
                {rounds.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <label className="text-slate-400 text-xs">Select round</label>
                    <select
                      value={selectedRoundNumber}
                      onChange={(e) => setSelectedRoundNumber(Number(e.target.value))}
                      className="glass-input py-1 px-2 text-sm max-w-[140px]"
                    >
                      {rounds.map((r: Round, idx: number) => (
                        r.judgingOpen
                          ? <option key={idx} value={idx + 1}>{r.name || `Round ${idx + 1}`}</option>
                          : null
                      ))}
                      {rounds.filter(r => r.judgingOpen).length === 0 && (
                        <option disabled>No rounds open for judging</option>
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <Link
              href={`/e/${eventSlug}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Participant Selection with Search */}
        <div className="glass-panel p-6 mb-6">
          <label className="block text-lg font-semibold text-white mb-3">
            🔍 Select Participant to Score
          </label>

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or type..."
              className="glass-input w-full px-4 py-3 placeholder-slate-400"
            />
            {searchQuery && (
              <p className="text-xs text-slate-400 mt-2">
                Found {filteredParticipants.length} matching participant{filteredParticipants.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Selected Participant Display */}
          {selectedParticipantData && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white font-semibold text-lg">{selectedParticipantData.name}</div>
                  <div className="flex items-center gap-3">
                    <div className="text-blue-400 text-sm capitalize">{selectedParticipantData.kind}</div>
                    {selectedCompleted ? (
                      <div className="text-green-400 text-sm font-semibold">✅ Completed this round</div>
                    ) : (
                      <div className="text-yellow-300 text-sm">Not completed</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedParticipant(null)
                    setSearchQuery('')
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Change ✕
                </button>
              </div>
            </div>
          )}

          {/* Round Selection Warning */}
          {rounds.length > 0 && !selectedRoundNumber && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-yellow-400 font-semibold mb-1">⚠️ Please Select a Round</div>
              <div className="text-slate-400 text-sm">You must select a round before you can score participants.</div>
            </div>
          )}

          {/* No Rounds Open Warning */}
          {rounds.length > 0 && rounds.filter(r => r.judgingOpen).length === 0 && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-red-400 font-semibold mb-1">🔒 No Rounds Open for Judging</div>
              <div className="text-slate-400 text-sm">Please wait for the admin to open judging for a round.</div>
            </div>
          )}

          {/* Participant List (show only when no participant selected) */}
          {!selectedParticipant && (
            <div className="max-h-96 overflow-y-auto">
              {!selectedRoundNumber && roundsConfig.length > 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-4">🔢</div>
                  <p className="text-slate-400 mb-2">Please select a round above to start scoring</p>
                </div>
              ) : filteredParticipants.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  {searchQuery ? 'No participants match your search' : 'No participants registered yet'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredParticipants.map((p) => {
                    const isCompleted = completedParticipants.has(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (!isCompleted && selectedRoundNumber) {
                            setSelectedParticipant(p.id)
                          } else if (!selectedRoundNumber) {
                            toast.error('Please select a round first')
                          }
                        }}
                        disabled={isCompleted || !selectedRoundNumber}
                        className={`w-full px-4 py-3 border rounded-lg text-left transition-colors group ${isCompleted || !selectedRoundNumber
                          ? 'bg-white/5 border-white/5 cursor-not-allowed opacity-60'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className={`font-medium transition-colors flex items-center gap-2 ${isCompleted
                              ? 'text-slate-500 line-through'
                              : 'text-white group-hover:text-blue-400'
                              }`}>
                              {p.name}
                              {isCompleted && (
                                <span className="text-green-400 text-xs font-semibold">✓ Completed</span>
                              )}
                            </div>
                            <div className="text-slate-400 text-sm capitalize">{p.kind}</div>
                          </div>
                          {!isCompleted && (
                            <div className="text-slate-500 group-hover:text-blue-400 transition-colors">
                              →
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scoring Rubric */}
        {selectedParticipant && (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Scoring Rubric</h2>

              </div>
              <div className="flex gap-4 pb-4 -mx-2 px-2 md:flex-row flex-col md:overflow-x-auto">
                {displayRubric.map((criterion, index) => (
                  <div
                    key={criterion.key || index}
                    className="rubric-card md:flex-shrink-0 min-w-0 w-full bg-white/5 border border-white/5 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-2">
                        <h3 className="text-base font-semibold text-white">{criterion.label}</h3>
                        {criterion.description && (
                          <p className="text-xs text-slate-400 mt-1">{criterion.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-xl font-bold text-blue-400">
                          {scores[criterion.key] || 0}
                        </div>
                        <div className="text-xs text-slate-500">/ {criterion.maxPoints}</div>
                      </div>
                    </div>

                    {/* Number Input for Score Entry */}
                    <div className="flex items-center justify-center py-2">
                      <input
                        aria-label={`Enter score for ${criterion.label}`}
                        placeholder="0"
                        type="number"
                        min={0}
                        max={criterion.maxPoints}
                        value={scores[criterion.key] ?? ''}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (e.target.value === '' || isNaN(v)) {
                            handleScoreChange(criterion.key, 0)
                          } else {
                            handleScoreChange(criterion.key, Math.max(0, Math.min(criterion.maxPoints, v)))
                          }
                        }}
                        className="w-14 px-2 py-1 rounded-lg bg-black/20 border-2 border-white/10 text-white text-2xl font-bold text-center focus:outline-none focus:border-blue-400 transition-colors"
                      />
                    </div>


                  </div>
                ))}
              </div>

              {/* Total Score */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total Score</span>
                  <div className="text-3xl font-bold text-green-400">
                    {currentTotal} <span className="text-slate-500 text-xl">/ {totalPossibleScore}</span>
                  </div>
                </div>
                <div className="mt-3 w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTotal / totalPossibleScore) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="glass-panel p-6">
              <label className="block text-lg font-semibold text-white mb-3">
                Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="glass-input w-full px-4 py-3 resize-none"
                rows={4}
                placeholder="Provide feedback or notes about this participant..."
              />
            </div>

            {/* Submit Button */}
            {selectedCompleted ? (
              <div className="w-full py-4 px-6 rounded-lg bg-green-500/10 border-2 border-green-500/30 text-center" style={{ minHeight: '56px' }}>
                <div className="text-green-400 font-semibold mb-1">✓ Round Already Completed</div>
                <div className="text-slate-400 text-sm">This participant has already been scored for this round. Rescoring is not allowed.</div>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedParticipant || selectedCompleted || !selectedRoundNumber}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
                style={{ minHeight: '56px' }}
              >
                {submitting ? 'Submitting Scores...' : '✓ Submit Scores'}
              </button>
            )}

            {!selectedRoundNumber && (
              <div className="mt-2 text-center text-yellow-400 text-sm">
                ⚠️ Please select a round before scoring
              </div>
            )}
          </div>
        )}

        {!selectedParticipant && rubric.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <div className="text-6xl mb-4">👆</div>
            <p className="text-slate-400 text-lg">
              Select a participant above to start scoring
            </p>
          </div>
        )}
      </main>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: none;
        }
        @media (min-width: 768px) {
          /* Fix rubric cards to a fifth of the container so five are visible without scrolling */
          .rubric-card {
            width: calc((100% - 4rem) / 5);
            max-width: calc((100% - 4rem) / 5);
            flex-shrink: 0;
            min-width: 0;
            max-height: 10rem;
            overflow: hidden;
          }
          .rubric-card textarea {
            max-height: 4.5rem;
          }
        }
      `}</style>
    </div>
  )
}
