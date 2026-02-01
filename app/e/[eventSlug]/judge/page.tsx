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
    <div className="w-4 h-4 rounded-full border border-slate-500 text-slate-500 flex items-center justify-center text-[10px] font-bold cursor-help hover:border-blue-400 hover:text-blue-400 transition-colors">
      i
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-white/10 rounded-lg shadow-2xl text-[10px] leading-relaxed text-slate-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 backdrop-blur-xl">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
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
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans pb-20 pt-24">
      <BroadcastTicker />
      <EventNavigation />

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10"
          style={{ backgroundColor: brandPrimary }}
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] bg-center" />
      </div>

      <header className="sticky top-0 z-40 bg-slate-950/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href={`/e/${eventSlug}/admin`}
              className="p-2 hover:bg-white/5 rounded-full transition-colors group"
              title="Back to Dashboard"
            >
              <LayoutDashboard className="w-5 h-5 text-slate-500 group-hover:text-white" />
            </Link>
            <div className="h-8 w-[1px] bg-white/5 hidden sm:block" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Judge Portal</h1>
                <div className="px-3 py-0.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${systemStatus.label.includes('LIVE') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                  <span className={`text-[10px] font-black font-mono tracking-widest ${systemStatus.color}`}>
                    {systemStatus.label}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{event?.name} // SYNC ACTIVE</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-xs font-bold text-white uppercase">{activeRound?.name || `Round ${selectedRoundNumber}`}</span>
              <span className="text-[10px] text-slate-500 font-mono">SCORING MODULE R{selectedRoundNumber}</span>
            </div>
            <Link
              href={`/e/${eventSlug}`}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
              title="View Public Standings"
            >
              <Trophy className="w-5 h-5 text-blue-400" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">

        {/* LEFT COLUMN: SENSOR ARRAY (Participant Selection) */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border-white/10 space-y-6">
            <div>
              <h3 className="text-[10px] font-black font-mono text-slate-500 tracking-[0.2em] uppercase mb-4 flex items-center justify-between">
                Participant List <InfoTip>Select a participant to start scoring.</InfoTip>
              </h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID / Name..."
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-blue-500/30 transition-all focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
              {filteredParticipants.map(p => {
                const isCompleted = completedParticipants.has(p.id)
                const isActive = selectedParticipant === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => !isCompleted && setSelectedParticipant(p.id)}
                    disabled={isCompleted}
                    className={`w-full group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 ${isActive
                      ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                      : isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/10 opacity-40 cursor-not-allowed'
                        : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
                        }`}>
                        {p.kind.toUpperCase()}
                      </span>
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className={`font-black text-left truncate transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-slate-600' : 'text-slate-300'}`}>
                      {p.name}
                    </div>
                    {isActive && (
                      <div className="absolute right-4 bottom-4">
                        <ChevronRight className="w-4 h-4 text-white/40" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 border-white/10">
            <h3 className="text-xs font-black font-mono text-slate-500 tracking-[0.2em] uppercase mb-4">Round Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">Completion</span>
                <span className="text-lg font-black font-mono text-white">
                  {completedParticipants.size} / {participants.length}
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000"
                  style={{ width: `${participants.length > 0 ? (completedParticipants.size / participants.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: SCORING MATRIX */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          {selectedParticipant ? (
            <>
              <div className="relative glass-panel rounded-[2.5rem] p-10 border-white/10 overflow-hidden group">
                {/* Subtle kinetic aura */}
                <div
                  className="absolute -inset-10 opacity-5 blur-[100px] transition-all duration-1000 pointer-events-none group-hover:opacity-10"
                  style={{ backgroundColor: brandPrimary }}
                />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                  <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl shadow-2xl">
                    {participants.find(p => p.id === selectedParticipant)?.kind === 'team' ? '👥' : '👤'}
                  </div>
                  <div className="flex-grow text-center md:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <span className="text-blue-400 font-mono text-xs tracking-[0.3em] font-black uppercase">Active Participant</span>
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase">
                        {participants.find(p => p.id === selectedParticipant)?.kind}
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic truncate">
                      {participants.find(p => p.id === selectedParticipant)?.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedParticipant(null)}
                    className="p-4 bg-white/5 hover:bg-rose-500/10 border border-white/5 rounded-2xl transition-all text-slate-500 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Submission Link Display */}
              {(() => {
                const p = participants.find(p => p.id === selectedParticipant)
                // adjustment: selectedRoundNumber is 1-based
                const entry = p?.entries?.find(e => e.roundNumber === selectedRoundNumber)
                if (entry) {
                  return (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="p-2 bg-blue-500 rounded-lg text-white">
                        <LayoutDashboard className="w-5 h-5" />
                      </div>
                      <div className="flex-grow">
                        <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Participant Submission</div>
                        <a href={entry.url} target="_blank" rel="noreferrer" className="text-white font-bold underline decoration-blue-500 hover:text-blue-300 truncate block max-w-md">
                          {entry.url}
                        </a>
                        {entry.notes && <div className="text-xs text-slate-400 mt-1 italic">"{entry.notes}"</div>}
                      </div>
                      <a href={entry.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg">
                        Open
                      </a>
                    </div>
                  )
                }
                return null
              })()}

              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black font-mono text-slate-500 tracking-[0.3em] uppercase">Scoring Console</h3>
                  <div className="text-[10px] text-slate-600 font-mono">SCORING IN PROGRESS</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayRubric.map((c, i) => (
                    <div key={c.key} className="glass-panel rounded-2xl p-6 border-white/5 space-y-6 transition-all hover:border-white/10 group/item">
                      <div className="flex items-start justify-between">
                        <div className="max-w-[70%]">
                          <h4 className="font-bold text-white text-lg tracking-tight group-hover/item:text-blue-400 transition-colors">{c.label}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed mt-1">{c.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black font-mono text-blue-400">{scores[c.key] || 0}</span>
                          <span className="text-xs font-bold text-slate-700 block mt-[-5px]">/ {c.maxPoints}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
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
                        <div className="flex justify-between text-[10px] font-black font-mono text-slate-600 uppercase">
                          <span>Min: 0</span>
                          <span>Max Points: {c.maxPoints}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-6 border-white/10 space-y-4">
                <h3 className="text-xs font-black font-mono text-slate-500 tracking-[0.2em] uppercase">Judge Comments</h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter observations or feedback..."
                  className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-white font-medium placeholder:text-slate-700 min-h-[120px] focus:border-blue-500/30 transition-all focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 pt-4">
                <div className="flex-grow flex items-center justify-between p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">AGGREGATE SCORE</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black font-mono text-emerald-400">{currentTotal}</span>
                      <span className="text-xl font-bold text-slate-600">/ {totalPossible}</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>

                <Button
                  disabled={submitting || !selectedParticipant || !activeRound?.judgingOpen}
                  onClick={handleSubmit}
                  className="w-full md:w-auto min-w-[240px] bg-blue-600 hover:bg-blue-500 text-white font-black py-10 rounded-[2rem] text-xl tracking-tighter uppercase italic transition-all active:scale-95 disabled:opacity-50 disabled:grayscale group shadow-2xl shadow-blue-500/20"
                >
                  {submitting ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      SAVING...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span>SUBMIT SCORE</span>
                      <span className="text-[10px] font-mono tracking-widest opacity-40 not-italic">SAVE TO LEADERBOARD</span>
                    </div>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center py-40 glass-panel rounded-[3rem] border-white/5 border-dashed border-2 opacity-60">
              <div className="text-6xl mb-6 grayscale group-hover:grayscale-0 transition-all">⚖️</div>
              <h2 className="text-2xl font-black text-white/40 uppercase tracking-widest italic">Portal Standby</h2>
              <p className="text-slate-600 font-mono text-sm mt-2 max-w-sm text-center">SELECT A PARTICIPANT FROM THE LIST ON THE LEFT</p>
            </div>
          )}
        </section>
      </main>

      {/* FOOTER MOBILE HUD */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
        <div className="glass-panel border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
              {selectedParticipant ? '🎯' : '📡'}
            </div>
            <div>
              <div className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">Participant</div>
              <div className="text-xs font-black text-white truncate max-w-[150px]">
                {selectedParticipant ? participants.find(p => p.id === selectedParticipant)?.name : 'Select Participant...'}
              </div>
            </div>
          </div>

          <div className="px-4 py-2 bg-blue-600 rounded-xl">
            <span className="text-xs font-black font-mono text-white">{currentTotal} PTS</span>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .accessibility-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 99px;
          background: rgba(255,255,255,0.05);
          outline: none;
          cursor: pointer;
        }
        
        .accessibility-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 10px;
          background: var(--accent);
          border: 4px solid rgba(2, 6, 23, 1);
          box-shadow: 0 0 15px var(--accent);
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .accessibility-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
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
