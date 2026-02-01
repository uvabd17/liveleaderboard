'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { EventNavigation } from '@/components/event-navigation'
import { EventCache } from '@/lib/cache'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/loading-spinner'
import { Info, ShieldAlert, CheckCircle2, Search, Trophy, Timer, LayoutDashboard, ChevronRight } from 'lucide-react'
import { BroadcastTicker } from '@/components/broadcast-ticker'

interface Participant {
  id: string
  name: string
  kind: string
  entries?: { roundNumber: number; url: string; notes?: string }[]
}

interface Criterion {
  key: string
  label: string
  maxPoints: number
  weight: number
  description: string
  rounds?: number[] | null
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
  rules: {
    rubric: any[]
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

// InfoTip Component (Reusable for consistency)
const InfoTip = ({ children }: { children: React.ReactNode }) => (
  <div className="group relative inline-block ml-2 align-middle">
    <div className="w-4 h-4 rounded-full border border-charcoal/30 text-charcoal/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:border-charcoal/50 hover:text-charcoal transition-colors">
      i
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-charcoal text-cream rounded-lg shadow-2xl text-[10px] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-charcoal" />
    </div>
  </div>
)

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

  // Authorization Check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/judge/access?eventSlug=${eventSlug}`)
      return
    }

    const isJudgeFlag = typeof window !== 'undefined' ? localStorage.getItem('user-role-judge') : null
    if (status === 'authenticated' && role === 'admin' && isJudgeFlag !== 'true') {
      // Allow admins to see it if they manually navigated but show a warning later or redirect
    }

    if (status === 'authenticated') {
      fetchJudgeData()
    }
  }, [status, role, eventSlug, router])

  // Real-time SSE Sync (Consolidated)
  useEffect(() => {
    if (!eventSlug) return
    const es = new EventSource(`/api/sse?eventSlug=${encodeURIComponent(eventSlug)}`)

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)

        if (payload?.type === 'round-change' || payload?.type === 'leaderboard-update') {
          if (payload?.type === 'round-change') {
            const incomingRounds = Array.isArray(payload.roundsConfig) ? payload.roundsConfig : []
            const normalized = incomingRounds.map((r: any) => ({
              ...r,
              judgingOpen: !!r.judgingOpen,
              judgingWindowMinutes: typeof r.judgingWindowMinutes === 'number' ? r.judgingWindowMinutes : null,
              roundDurationMinutes: r.roundDurationMinutes ?? r.duration ?? null,
            }))
            setRounds(normalized)
            if (typeof payload.currentRound === 'number') {
              setSelectedRoundNumber(payload.currentRound + 1)
            }
          }
          setCompletionsRevision(prev => prev + 1)
        }

        if (payload?.type === 'scoring-schema') {
          fetchJudgeData() // Refresh everything on schema change
          toast('Scoring Schema Updated', { icon: '🔄' })
        }
      } catch (e) { }
    }

    es.onerror = () => { try { es.close() } catch { } }
    return () => es.close()
  }, [eventSlug])

  const fetchJudgeData = async () => {
    try {
      const [eventRes, participantsRes, roundsRes] = await Promise.all([
        fetch(`/api/events/${eventSlug}`),
        fetch(`/api/events/${eventSlug}/participants`),
        fetch(`/api/rounds?eventSlug=${eventSlug}`)
      ])

      if (eventRes.ok) {
        const eventData = await eventRes.json()
        setEvent(eventData.event)

        if (participantsRes.ok) {
          const pData = await participantsRes.json()
          setParticipants(pData.participants)
        }

        if (roundsRes.ok) {
          const rData = await roundsRes.json()
          setRounds(rData.rounds || [])
          if (typeof rData.currentRound === 'number') {
            setSelectedRoundNumber(rData.currentRound + 1)
          }
        }
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch completions when round changes or SSE update received
  const [completionsRevision, setCompletionsRevision] = useState(0)

  useEffect(() => {
    if (!eventSlug || !selectedRoundNumber) return

    const fetchCompletions = async () => {
      try {
        const res = await fetch(`/api/events/${eventSlug}/round-completions?roundNumber=${selectedRoundNumber - 1}`)
        if (res.ok) {
          const data = await res.json()
          const completed = new Set<string>()
          if (Array.isArray(data.rows)) {
            data.rows.forEach((r: any) => { if (r.participantId) completed.add(r.participantId) })
          }
          setCompletedParticipants(completed)
        }
      } catch (e) { }
    }
    fetchCompletions()
  }, [eventSlug, selectedRoundNumber, completionsRevision])

  const handleScoreChange = (key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!selectedParticipant || submitting) return

    // Check if judging is open
    const currentRound = rounds[selectedRoundNumber - 1]
    if (!currentRound?.judgingOpen) {
      toast.error('Judging is currently locked for this round')
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
          roundNumber: selectedRoundNumber - 1,
        })
      })

      if (response.ok) {
        toast.success('Scores Broadcast Successfully!', {
          style: { background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        })
        setScores({})
        setComment('')
        setCompletedParticipants(prev => new Set([...prev, selectedParticipant]))
        setSelectedParticipant(null)
      } else {
        const err = await response.json()
        toast.error(err.error || 'Submission failed')
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  // Normalize Rubric
  const displayRubric = useMemo(() => {
    if (!event?.rules?.rubric) return []
    return (event.rules.rubric as any[]).map(r => ({
      key: r.key ?? r.name,
      label: r.label ?? r.name,
      maxPoints: Number(r.max ?? r.maxPoints ?? 100),
      description: r.description ?? '',
      rounds: Array.isArray(r.rounds) ? r.rounds.map((v: any) => Number(v)) : null,
    })).filter(c => !c.rounds || c.rounds.includes(selectedRoundNumber))
  }, [event?.rules?.rubric, selectedRoundNumber])

  const totalPossible = displayRubric.reduce((sum, c) => sum + c.maxPoints, 0)
  const currentTotal = Object.entries(scores).reduce((sum, [k, v]) => {
    const r = displayRubric.find(cr => cr.key === k)
    return sum + (r ? v : 0)
  }, 0)

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.kind.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeRound = rounds[selectedRoundNumber - 1]
  const brandPrimary = event?.brandColors?.primary || '#3b82f6'

  const systemStatus = useMemo(() => {
    if (!activeRound) return { label: 'STANDBY', color: 'text-slate-500' }
    if (activeRound.judgingOpen) return { label: 'LIVE / JUDGING OPEN', color: 'text-emerald-400' }
    return { label: 'LOCKED', color: 'text-rose-400' }
  }, [activeRound])

  if (loading || status === 'loading') {
    return <PageLoading message="Judge Portal" submessage="Preparing scoring interface..." />
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal pb-20 pt-24">
      <BroadcastTicker />
      <EventNavigation />

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-5"
          style={{ backgroundColor: brandPrimary }}
        />
      </div>

      <header className="sticky top-0 z-40 bg-cream/80 backdrop-blur-xl border-b border-charcoal/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/e/${eventSlug}/admin`}
              className="p-2 hover:bg-charcoal/5 rounded-lg transition-colors group"
              title="Back to Dashboard"
            >
              <LayoutDashboard className="w-5 h-5 text-charcoal/40 group-hover:text-charcoal" />
            </Link>
            <div className="h-6 w-px bg-charcoal/10 hidden sm:block" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-lg font-semibold text-charcoal">Judge Portal</h1>
                <div className="px-2 py-0.5 bg-charcoal/5 rounded-full flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${systemStatus.label.includes('LIVE') ? 'bg-emerald-500 animate-pulse' : 'bg-charcoal/30'}`} />
                  <span className={`text-[10px] font-medium ${systemStatus.label.includes('LIVE') ? 'text-emerald-600' : systemStatus.label.includes('LOCKED') ? 'text-rose-500' : 'text-charcoal/40'}`}>
                    {systemStatus.label}
                  </span>
                </div>
              </div>
              <p className="text-xs text-charcoal/40">{event?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-charcoal">{activeRound?.name || `Round ${selectedRoundNumber}`}</span>
              <span className="text-[10px] text-charcoal/40">Round {selectedRoundNumber}</span>
            </div>
            <Link
              href={`/e/${eventSlug}`}
              className="p-2 bg-charcoal/5 hover:bg-charcoal/10 rounded-lg transition-all"
              title="View Public Standings"
            >
              <Trophy className="w-5 h-5 text-charcoal/60" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">

        {/* LEFT COLUMN: Participant Selection */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-charcoal mb-3 flex items-center justify-between">
                Participants <InfoTip>Select a participant to start scoring.</InfoTip>
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search participants..."
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
              {filteredParticipants.map(p => {
                const isCompleted = completedParticipants.has(p.id)
                const isActive = selectedParticipant === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => !isCompleted && setSelectedParticipant(p.id)}
                    disabled={isCompleted}
                    className={`w-full group relative flex flex-col p-3 rounded-xl border transition-all ${isActive
                      ? 'bg-charcoal text-cream border-charcoal'
                      : isCompleted
                        ? 'bg-emerald-50 border-emerald-100 opacity-60 cursor-not-allowed'
                        : 'bg-white border-charcoal/10 hover:border-charcoal/20'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${isActive ? 'bg-cream/20 text-cream' : 'bg-charcoal/5 text-charcoal/50'
                        }`}>
                        {p.kind.toUpperCase()}
                      </span>
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className={`font-medium text-left truncate transition-colors ${isActive ? 'text-cream' : isCompleted ? 'text-charcoal/40' : 'text-charcoal'}`}>
                      {p.name}
                    </div>
                    {isActive && (
                      <div className="absolute right-3 bottom-3">
                        <ChevronRight className="w-4 h-4 text-cream/40" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium text-charcoal mb-3">Round Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-charcoal/60">Scored</span>
                <span className="text-lg font-mono font-bold text-charcoal">
                  {completedParticipants.size} / {participants.length}
                </span>
              </div>
              <div className="h-2 w-full bg-charcoal/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-charcoal transition-all duration-1000"
                  style={{ width: `${participants.length > 0 ? (completedParticipants.size / participants.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: SCORING */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {selectedParticipant ? (
            <>
              <div className="card p-8 group">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-charcoal/5 flex items-center justify-center text-3xl">
                    {participants.find(p => p.id === selectedParticipant)?.kind === 'team' ? '👥' : '👤'}
                  </div>
                  <div className="flex-grow text-center md:text-left space-y-1">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="badge-minimal">Active Participant</span>
                      <span className="badge-minimal bg-charcoal/5">
                        {participants.find(p => p.id === selectedParticipant)?.kind}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-semibold text-charcoal truncate">
                      {participants.find(p => p.id === selectedParticipant)?.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedParticipant(null)}
                    className="p-3 bg-charcoal/5 hover:bg-rose-50 rounded-xl transition-all text-charcoal/40 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Submission Link Display */}
              {(() => {
                const p = participants.find(p => p.id === selectedParticipant)
                const entry = p?.entries?.find(e => e.roundNumber === selectedRoundNumber)
                if (entry) {
                  return (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-charcoal/5 border border-charcoal/10">
                      <div className="p-2 bg-charcoal rounded-lg text-cream">
                        <LayoutDashboard className="w-5 h-5" />
                      </div>
                      <div className="flex-grow">
                        <div className="text-xs font-medium text-charcoal/60">Submission Link</div>
                        <a href={entry.url} target="_blank" rel="noreferrer" className="text-charcoal font-medium underline decoration-charcoal/30 hover:decoration-charcoal truncate block max-w-md">
                          {entry.url}
                        </a>
                        {entry.notes && <div className="text-xs text-charcoal/40 mt-1 italic">"{entry.notes}"</div>}
                      </div>
                      <a href={entry.url} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 rounded-lg text-sm">
                        Open
                      </a>
                    </div>
                  )
                }
                return null
              })()}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-charcoal">Scoring Criteria</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayRubric.map((c, i) => (
                    <div key={c.key} className="card p-5 space-y-4 group/item">
                      <div className="flex items-start justify-between">
                        <div className="max-w-[70%]">
                          <h4 className="font-medium text-charcoal group-hover/item:text-charcoal/80 transition-colors">{c.label}</h4>
                          <p className="text-xs text-charcoal/40 leading-relaxed mt-1">{c.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-mono font-bold text-charcoal">{scores[c.key] || 0}</span>
                          <span className="text-xs text-charcoal/30 block">/ {c.maxPoints}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max={c.maxPoints}
                          step="1"
                          value={scores[c.key] || 0}
                          onChange={(e) => handleScoreChange(c.key, Number(e.target.value))}
                          className="w-full accessibility-slider"
                          style={{ '--accent': brandPrimary } as any}
                        />
                        <div className="flex justify-between text-[10px] text-charcoal/30">
                          <span>0</span>
                          <span>{c.maxPoints}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 space-y-3">
                <h3 className="text-sm font-medium text-charcoal">Comments</h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter feedback or observations..."
                  className="input min-h-[100px] resize-none"
                />
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 pt-2">
                <div className="flex-grow flex items-center justify-between p-6 card">
                  <div>
                    <span className="text-xs text-charcoal/40 block mb-1">Total Score</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono font-bold text-charcoal">{currentTotal}</span>
                      <span className="text-lg text-charcoal/30">/ {totalPossible}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-charcoal/5 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-charcoal/40" />
                  </div>
                </div>

                <Button
                  disabled={submitting || !selectedParticipant || !activeRound?.judgingOpen}
                  onClick={handleSubmit}
                  className="w-full md:w-auto min-w-[200px] btn-primary py-6 rounded-xl text-base font-medium transition-all active:scale-95 disabled:opacity-50 group"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <span>Submit Score</span>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center py-32 card border-dashed">
              <div className="w-16 h-16 rounded-full bg-charcoal/5 flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-charcoal/20" />
              </div>
              <h2 className="font-display text-xl font-semibold text-charcoal/60 mb-2">Ready to Score</h2>
              <p className="text-charcoal/40 text-sm">Select a participant from the list</p>
            </div>
          )}
        </section>
      </main>

      {/* MOBILE HUD */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
        <div className="card p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-charcoal/5 flex items-center justify-center text-lg">
              {selectedParticipant ? '🎯' : '📡'}
            </div>
            <div>
              <div className="text-[10px] text-charcoal/40">Participant</div>
              <div className="text-sm font-medium text-charcoal truncate max-w-[150px]">
                {selectedParticipant ? participants.find(p => p.id === selectedParticipant)?.name : 'Select...'}
              </div>
            </div>
          </div>

          <div className="px-4 py-2 bg-charcoal text-cream rounded-lg">
            <span className="text-sm font-mono font-bold">{currentTotal} pts</span>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .accessibility-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 99px;
          background: rgba(26,26,26,0.1);
          outline: none;
          cursor: pointer;
        }
        
        .accessibility-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 10px;
          background: var(--accent);
          border: 3px solid #faf9f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .accessibility-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}
