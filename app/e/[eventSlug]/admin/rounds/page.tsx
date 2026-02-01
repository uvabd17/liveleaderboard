"use client"

import React, { useEffect, useState, useMemo } from "react";
import toast from 'react-hot-toast'
import Link from 'next/link';
import { EventNavigation } from '@/components/event-navigation';
import { CircularTimerControl } from '@/components/circular-timer-control';
import { Button } from '@/components/ui/button';

interface Round {
  name: string;
  roundDurationMinutes: number;
  judgingOpen?: boolean;
  judgingWindowMinutes?: number | null;
  judgingOpenedAt?: string | null;
  timerStartedAt?: string | null;
  timerPausedAt?: string | null;
  timerRunning?: boolean;
}

type EditState = {
  idx: number;
  name: string;
  timer: number;
  judgingWindowMinutes: number | null;
} | null;

// Tooltip Component
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

const fetchRounds = async (eventSlug: string) => {
  const res = await fetch(`/api/rounds?eventSlug=${eventSlug}`);
  if (!res.ok) throw new Error("Failed to fetch rounds");
  return res.json();
};

const createOrUpdateRound = async (
  eventSlug: string,
  round: Partial<Round> & { number: number }
) => {
  const res = await fetch("/api/rounds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "configure",
      eventSlug,
      roundConfig: round,
    }),
  });
  if (!res.ok) throw new Error("Failed to create/update round");
  return res.json();
};

const AdminRoundsPage = ({ params }: { params: { eventSlug: string } }) => {
  const { eventSlug } = params;
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0)
  const [eventData, setEventData] = useState<any>(null)
  const [participantsCount, setParticipantsCount] = useState<number>(0)
  const [completedCount, setCompletedCount] = useState<number>(0)

  // Form states
  const [name, setName] = useState("");
  const [timer, setTimer] = useState(0);
  const [judgingWindow, setJudgingWindow] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>(null);
  const [showCreate, setShowCreate] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'urgent'>('info')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return
    setSendingBroadcast(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug,
          message: broadcastMessage,
          type: broadcastType
        })
      })
      if (res.ok) {
        toast.success('Broadcast Sent')
        setBroadcastMessage('')
      } else {
        throw new Error('Failed to send')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSendingBroadcast(false)
    }
  }

  // Load initial data
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [roundsData, eventRes, participantsRes] = await Promise.all([
          fetchRounds(eventSlug),
          fetch(`/api/events/${eventSlug}`),
          fetch(`/api/events/${eventSlug}/participants`)
        ])
        setRounds(roundsData.rounds || [])
        setCurrentRoundIdx(roundsData.currentRound ?? 0)
        if (eventRes.ok) {
          const ed = await eventRes.json()
          setEventData(ed.event)
        }
        if (participantsRes.ok) {
          const pd = await participantsRes.json()
          setParticipantsCount(pd.participants?.length || 0)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [eventSlug]);

  // Fetch completions for active round
  useEffect(() => {
    if (!eventSlug || rounds.length === 0) return
    
    const fetchCompletions = async () => {
      try {
        const res = await fetch(`/api/events/${eventSlug}/round-completions?roundNumber=${currentRoundIdx}`)
        if (res.ok) {
          const data = await res.json()
          const uniqueCompleted = new Set()
          if (Array.isArray(data.rows)) {
            data.rows.forEach((r: any) => { if (r.participantId) uniqueCompleted.add(r.participantId) })
          }
          setCompletedCount(uniqueCompleted.size)
        }
      } catch (e) { }
    }
    
    fetchCompletions()
    // Poll every 10s for updates
    const interval = setInterval(fetchCompletions, 10000)
    return () => clearInterval(interval)
  }, [eventSlug, currentRoundIdx, rounds.length])

  const refreshRounds = async () => {
    try {
      const data = await fetchRounds(eventSlug)
      setRounds(data.rounds || [])
      setCurrentRoundIdx(data.currentRound ?? 0)
    } catch (e: any) {
      toast.error("Failed to sync rounds")
    }
  }

  const postAction = async (payload: any) => {
    setLoading(true)
    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, eventSlug }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Action failed')

      if (json?.rounds) setRounds(json.rounds)
      if (typeof json?.currentRound === 'number') setCurrentRoundIdx(json.currentRound)

      toast.success('System Updated')
      return json
    } catch (e: any) {
      toast.error(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrent = async (idx: number) => {
    if (idx === currentRoundIdx) return
    const prev = currentRoundIdx
    setCurrentRoundIdx(idx)
    try {
      await postAction({ action: 'set', roundNumber: idx })
    } catch (e) {
      setCurrentRoundIdx(prev)
      await refreshRounds()
    }
  }

  const handleOpenJudging = (idx: number, windowMinutes: number | null = null) => {
    postAction({ action: 'judging', judging: { roundNumber: idx, open: true, windowMinutes } })
  }

  const handleCloseJudging = (idx: number) => {
    postAction({ action: 'judging', judging: { roundNumber: idx, open: false } })
  }

  const handleDeleteRound = (idx: number) => {
    if (!confirm('Permanently delete this round and all its data? This cannot be undone.')) return
    postAction({ action: 'delete', roundNumber: idx })
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return toast.error("Name is required")
    setLoading(true)
    try {
      await createOrUpdateRound(eventSlug, { number: rounds.length, name, roundDurationMinutes: timer, judgingWindowMinutes: judgingWindow })
      setName('')
      setTimer(0)
      setJudgingWindow(null)
      setShowCreate(false)
      await refreshRounds()
      toast.success('Round Created')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    setLoading(true)
    try {
      await createOrUpdateRound(eventSlug, { number: edit.idx, name: edit.name, roundDurationMinutes: edit.timer, judgingWindowMinutes: edit.judgingWindowMinutes })
      setEdit(null)
      await refreshRounds()
      toast.success('Configuration Saved')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const activeRound = rounds[currentRoundIdx] || null
  const brandPrimary = eventData?.brandColors?.primary || '#3b82f6'

  const systemStatus = useMemo(() => {
    if (!activeRound) return { label: 'STANDBY', color: 'text-slate-500' }
    if (activeRound.timerRunning) return { label: 'LIVE / TIMER RUNNING', color: 'text-blue-400' }
    if (activeRound.judgingOpen) return { label: 'JUDGING PHASE', color: 'text-emerald-400' }
    return { label: 'ROUND READY', color: 'text-white/60' }
  }, [activeRound])

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-slate-200 selection:bg-[#1A1A1A]/10 dark:selection:bg-blue-500/30 pt-24">
      <EventNavigation />

      <main className="max-w-[1400px] mx-auto px-6 py-10 space-y-12 animate-fade-in">

        {/* SECTION: ROUND TIMELINE */}
        <header className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black tracking-tighter text-[#1A1A1A] dark:text-white uppercase italic">Live Event Control</h1>
                <div className="px-3 py-1 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-full flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus.label.includes('LIVE') ? 'bg-blue-500' : 'bg-[#1A1A1A]/30 dark:bg-slate-500'}`} />
                  <span className={`text-[10px] font-black font-mono tracking-widest ${systemStatus.color}`}>
                    SYSTEM: {systemStatus.label}
                  </span>
                </div>
              </div>
              <p className="text-[#1A1A1A]/50 dark:text-slate-500 font-mono text-sm tracking-wider">EVENT CONSOLE // ROUND MANAGEMENT</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-white text-black hover:bg-slate-200 font-bold px-6 h-12 rounded-2xl"
              >
                + ADD ROUND
              </Button>
            </div>
          </div>

          {rounds.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center text-xs font-black font-mono text-[#1A1A1A]/40 dark:text-slate-600 gap-2">
                <span>ROUND TIMELINE</span>
                <InfoTip>Click any round to activate it. The active round is what spectators see on the Stage display.</InfoTip>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
                {rounds.map((r, idx) => {
                  const isActive = idx === currentRoundIdx
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSetCurrent(idx)}
                      className={`group relative flex-shrink-0 min-w-[200px] p-4 rounded-2xl border transition-all duration-500 ${isActive
                        ? 'bg-[#1A1A1A]/10 dark:bg-white/10 border-[#1A1A1A]/20 dark:border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.05)] dark:shadow-[0_0_30px_rgba(255,255,255,0.05)]'
                        : 'bg-[#1A1A1A]/5 dark:bg-white/5 border-[#1A1A1A]/5 dark:border-white/5 hover:border-[#1A1A1A]/10 dark:hover:border-white/10 opacity-60 hover:opacity-100'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${isActive ? 'bg-[#1A1A1A] dark:bg-white text-white dark:text-black' : 'bg-[#1A1A1A]/10 dark:bg-white/10 text-[#1A1A1A]/40 dark:text-white/40 group-hover:bg-[#1A1A1A]/20 dark:group-hover:bg-white/20'
                          }`}>
                          R{idx + 1}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-black font-mono text-blue-600 dark:text-blue-400">ACTIVE</span>
                        )}
                        {r.timerRunning && !isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                        )}
                      </div>
                      <div className={`font-bold truncate transition-colors ${isActive ? 'text-[#1A1A1A] dark:text-white' : 'text-[#1A1A1A]/60 dark:text-slate-400'}`}>
                        {r.name}
                      </div>
                      <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono mt-1">
                        {r.roundDurationMinutes}m DURATION
                      </div>

                      {isActive && (
                        <div
                          className="absolute -bottom-[1px] left-4 right-4 h-[2px] blur-[1px]"
                          style={{ backgroundColor: brandPrimary }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="card rounded-3xl p-12 text-center border-dashed border-2 border-[#1A1A1A]/10 dark:border-white/10">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-[#1A1A1A] dark:text-white mb-2">Ready for Lift-off</h3>
              <p className="text-[#1A1A1A]/50 dark:text-slate-500 max-w-md mx-auto mb-8 font-mono text-sm">You haven't created any rounds yet. Rounds define the timeline of your event and manage when judging is open.</p>
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-6 h-auto text-lg rounded-2xl shadow-xl shadow-blue-500/20"
              >
                CREATE YOUR FIRST ROUND
              </Button>
            </div>
          )}
        </header>

        {rounds.length > 0 && (
          <>
            {/* SECTION: MAIN ENGINE (Active Round Monolith) */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              <div className="lg:col-span-8 group relative">
                {/* Background Kinetic Glow */}
                <div
                  className="absolute -inset-4 opacity-10 blur-[100px] transition-all duration-1000 group-hover:opacity-20 pointer-events-none"
                  style={{ backgroundColor: brandPrimary }}
                />

                <div className="relative card rounded-[2.5rem] p-10 border-[#1A1A1A]/10 dark:border-white/10 flex flex-col md:flex-row items-center gap-12 overflow-hidden">
                  {/* Massive Timer Section */}
                  {activeRound ? (
                    <>
                      <div className="flex-shrink-0 relative scale-110">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black font-mono text-blue-400/60 flex items-center gap-1">
                          EVENT CONTROL
                          <InfoTip>Starts the countdown on the Live Display. Pausing here reflects instantly for all viewers.</InfoTip>
                        </div>
                        <CircularTimerControl
                          round={activeRound}
                          roundIdx={currentRoundIdx}
                          currentRoundIdx={currentRoundIdx}
                          onStartTimer={() => postAction({ action: 'start', roundNumber: currentRoundIdx })}
                          onPauseTimer={() => postAction({ action: 'pause', roundNumber: currentRoundIdx })}
                          onResumeTimer={() => postAction({ action: 'resume', roundNumber: currentRoundIdx })}
                          onStopTimer={() => postAction({ action: 'stop', roundNumber: currentRoundIdx })}
                          loading={loading}
                        />
                      </div>

                      <div className="flex-grow space-y-6 text-center md:text-left pt-6">
                        <div>
                          <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                            <span className="text-blue-600 dark:text-blue-400 font-mono text-xs tracking-[0.3em] font-black uppercase">Live Round Engine</span>
                            {activeRound.judgingOpen && (
                              <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                JUDGES ARE ACTIVE
                              </span>
                            )}
                          </div>
                          <h2 className="text-5xl md:text-6xl font-black text-[#1A1A1A] dark:text-white tracking-tighter uppercase italic leading-tight">
                            {activeRound.name}
                          </h2>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 bg-[#1A1A1A]/5 dark:bg-white/5 rounded-2xl border border-[#1A1A1A]/5 dark:border-white/5 relative">
                            <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono mb-1 flex items-center justify-between">
                              DURATION <InfoTip>The total time allowed for this round in minutes.</InfoTip>
                            </div>
                            <div className="text-xl font-black text-[#1A1A1A] dark:text-white">{activeRound.roundDurationMinutes} minutes</div>
                          </div>
                          <div className="p-4 bg-[#1A1A1A]/5 dark:bg-white/5 rounded-2xl border border-[#1A1A1A]/5 dark:border-white/5 relative">
                            <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono mb-1 flex items-center justify-between">
                              JUDGE WINDOW <InfoTip>How long the judging portal stays open. Sets to duration by default.</InfoTip>
                            </div>
                            <div className="text-xl font-black text-[#1A1A1A] dark:text-white">{activeRound.judgingWindowMinutes || 'Unrestricted'}m</div>
                          </div>
                          <div className="p-4 bg-[#1A1A1A]/5 dark:bg-white/5 rounded-2xl border border-[#1A1A1A]/5 dark:border-white/5 relative">
                            <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono mb-1 flex items-center justify-between">
                              COMPLETION <InfoTip>Number of participants who have received a score for this round.</InfoTip>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</span>
                              <span className="text-sm font-bold text-[#1A1A1A]/40 dark:text-slate-600">/ {participantsCount}</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1A1A1A]/5 dark:bg-white/5 rounded-b-2xl overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-1000" 
                                style={{ width: `${participantsCount > 0 ? (completedCount / participantsCount) * 100 : 0}%` }} 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                          {activeRound.judgingOpen ? (
                            <Button
                              onClick={() => handleCloseJudging(currentRoundIdx)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-black px-8 py-6 rounded-2xl transition-all hover:scale-105 active:scale-95 h-auto text-base"
                            >
                              LOCK JUDGING NOW
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleOpenJudging(currentRoundIdx, activeRound.judgingWindowMinutes)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-6 rounded-2xl transition-all hover:scale-105 active:scale-95 h-auto text-base"
                            >
                              OPEN FOR JUDGING
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            onClick={() => setEdit({
                              idx: currentRoundIdx,
                              name: activeRound.name,
                              timer: activeRound.roundDurationMinutes,
                              judgingWindowMinutes: activeRound.judgingWindowMinutes ?? null
                            })}
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-black px-8 py-6 rounded-2xl transition-all h-auto"
                          >
                            EDIT SETTINGS
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full text-center py-20">
                      <div className="text-4xl opacity-20 mb-4">⚓</div>
                      <h2 className="text-2xl font-black text-white/40 uppercase tracking-widest italic">Engine Standby</h2>
                      <p className="text-slate-600 font-mono text-sm mt-2">SELECT A ROUND MODULE FROM THE RAIL ABOVE</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SIDEBAR: Tools & Reports */}
              <div className="lg:col-span-4 space-y-6">
                <div className="card rounded-3xl p-6 border-[#1A1A1A]/10 dark:border-white/10 space-y-4">
                  <h3 className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.2em] uppercase flex items-center justify-between">
                    REPORTS & EXPORTS <InfoTip>Download detailed participant performance data for the entire event or just this round.</InfoTip>
                  </h3>
                  <div className="space-y-2">
                    <Link
                      href={`/api/admin/export?eventSlug=${eventSlug}`}
                      target="_blank"
                      className="flex items-center justify-between p-4 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-[#1A1A1A]/5 dark:border-white/5 rounded-2xl transition-all group"
                    >
                      <div>
                        <div className="font-bold text-sm text-[#1A1A1A] dark:text-white">Full Event Results</div>
                        <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono uppercase">All scoring modules (.CSV)</div>
                      </div>
                      <div className="text-xl group-hover:translate-x-1 transition-transform">📊</div>
                    </Link>

                    {activeRound && (
                      <Link
                        href={`/api/events/${eventSlug}/round-completions?roundNumber=${currentRoundIdx}`}
                        target="_blank"
                        className="flex items-center justify-between p-4 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-[#1A1A1A]/5 dark:border-white/5 rounded-2xl transition-all group"
                      >
                        <div>
                          <div className="font-bold text-sm text-[#1A1A1A] dark:text-white">Active Round Scores</div>
                          <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono uppercase">Single module only (.CSV)</div>
                        </div>
                        <div className="text-xl group-hover:translate-x-1 transition-transform">🎯</div>
                      </Link>
                    )}

                    <Link
                      href={`/e/${eventSlug}/admin/analytics`}
                      className="flex items-center justify-between p-4 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-blue-600 border border-[#1A1A1A]/5 dark:border-white/5 rounded-2xl transition-all group"
                    >
                      <div>
                        <div className="font-bold text-sm text-[#1A1A1A] dark:text-white group-hover:text-white">Live Observer Insights</div>
                        <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 group-hover:text-white/60 font-mono uppercase">Judge bias & tracking</div>
                      </div>
                      <div className="text-xl group-hover:translate-x-1 transition-transform">📈</div>
                    </Link>
                  </div>
                </div>

                <div className="card rounded-3xl p-6 border-[#1A1A1A]/10 dark:border-white/10 space-y-4">
                  <h3 className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.2em] uppercase flex items-center justify-between">
                    ANNOUNCEMENT CENTER <InfoTip>Send real-time alerts to all active screens (Display, Official, Participant).</InfoTip>
                  </h3>
                  <div className="space-y-4">
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type a message to all screens..."
                      className="w-full h-20 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl p-3 text-sm text-[#1A1A1A] dark:text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                    />
                    <div className="flex gap-2">
                      {([['info', '🔵'], ['warning', '🟡'], ['urgent', '🔴']] as const).map(([type, icon]) => (
                        <button
                          key={type}
                          onClick={() => setBroadcastType(type)}
                          className={`flex-1 py-2 rounded-lg border text-[10px] font-black font-mono transition-all ${broadcastType === type
                            ? 'bg-[#1A1A1A]/10 dark:bg-white/10 border-[#1A1A1A]/20 dark:border-white/20 text-[#1A1A1A] dark:text-white'
                            : 'bg-transparent border-[#1A1A1A]/5 dark:border-white/5 text-[#1A1A1A]/50 dark:text-slate-500 hover:border-[#1A1A1A]/10 dark:hover:border-white/10'
                            }`}
                        >
                          {icon} {type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleSendBroadcast}
                      disabled={sendingBroadcast || !broadcastMessage.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/10 h-auto"
                    >
                      {sendingBroadcast ? 'TRANSMITTING...' : 'SEND ANNOUNCEMENT'}
                    </Button>
                  </div>
                </div>

                <div className="card rounded-3xl p-6 border-[#1A1A1A]/10 dark:border-white/10">
                  <h3 className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.2em] uppercase mb-4">Command History</h3>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar font-mono text-[10px]">
                    <div className="flex gap-3 text-emerald-600/60 dark:text-emerald-400/60">
                      <span>[SYS]</span>
                      <span>EVENT CONTROL ONLINE - AUTHENTICATED</span>
                    </div>
                    {rounds.length > 0 && (
                      <div className="flex gap-3 text-[#1A1A1A]/50 dark:text-slate-500 border-l border-[#1A1A1A]/5 dark:border-white/5 pl-3">
                        <span>[RND]</span>
                        <span>LOADED {rounds.length} MODULES INTO MEMORY</span>
                      </div>
                    )}
                    <div className="flex gap-3 text-blue-600/60 dark:text-blue-400/60 border-l border-[#1A1A1A]/5 dark:border-white/5 pl-3">
                      <span>[SSE]</span>
                      <span>STAGE BROADCAST SYNC: ACTIVE</span>
                    </div>
                    <div className="flex gap-3 text-[#1A1A1A]/40 dark:text-slate-600 border-l border-[#1A1A1A]/5 dark:border-white/5 pl-3">
                      <span>[CMD]</span>
                      <span>WAITING FOR OPERATOR INPUT...</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION: ALL ROUNDS */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black font-mono text-slate-500 tracking-[0.3em] uppercase">All Rounds</h3>
                <div className="text-[10px] text-slate-600 font-mono">ALL DEFINED ROUND CONFIGS</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rounds.map((r, idx) => (
                  <div
                    key={idx}
                    className={`group relative glass-panel rounded-2xl p-6 border transition-all ${idx === currentRoundIdx ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">Round {idx + 1}</div>
                        <h4 className="font-black text-xl italic uppercase tracking-tight text-white">{r.name}</h4>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEdit({ idx, name: r.name, timer: r.roundDurationMinutes, judgingWindowMinutes: r.judgingWindowMinutes ?? null }) }}
                          title="Edit Round Settings"
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteRound(idx) }}
                          title="Delete Round"
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/20 text-rose-500 text-xs"
                        >
                          DEL
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        {r.roundDurationMinutes}m DURATION
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${r.judgingOpen ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-600'}`} />
                        JUDGING {r.judgingOpen ? 'OPEN' : 'LOCKED'}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSetCurrent(idx)}
                      disabled={idx === currentRoundIdx}
                      variant="outline"
                      className={`w-full mt-6 font-bold py-3 h-auto rounded-xl transition-all ${idx === currentRoundIdx
                        ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                        }`}
                    >
                      {idx === currentRoundIdx ? 'SIMULATION ACTIVE' : 'ACTIVATE MODULE'}
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

      </main>

      {/* OVERLAY: RECONFIGURE SYSTEM (Edit Modal) */}
      {edit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEdit(null)} />
          <div className="relative card rounded-3xl border-[#1A1A1A]/10 dark:border-white/10 p-8 w-full max-w-lg animate-bounce-in">
            <h3 className="text-2xl font-black text-[#1A1A1A] dark:text-white italic uppercase mb-6 tracking-tighter">Adjust Module R{edit.idx + 1}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase mb-2">IDENTIFIER (NAME)</label>
                  <input
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    className="input w-full px-4 py-4 text-lg font-bold"
                    placeholder="Round Name"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase mb-2 flex items-center justify-between">
                      TIMER (MIN) <InfoTip>How long the timer should run when started.</InfoTip>
                    </label>
                    <input
                      type="number"
                      value={edit.timer}
                      onChange={(e) => setEdit({ ...edit, timer: Number(e.target.value) })}
                      className="input w-full px-4 py-4 text-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase mb-2 flex items-center justify-between">
                      JUDGING (MIN) <InfoTip>Optional: Locks judging automatically after this many minutes. Leave empty for infinite.</InfoTip>
                    </label>
                    <input
                      type="number"
                      value={edit.judgingWindowMinutes || ''}
                      placeholder="Infinite"
                      onChange={(e) => setEdit({ ...edit, judgingWindowMinutes: e.target.value === '' ? null : Number(e.target.value) })}
                      className="input w-full px-4 py-4 text-lg font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-grow bg-blue-600 hover:bg-blue-500 text-white font-black py-4 h-auto rounded-2xl transition-all text-lg shadow-xl shadow-blue-500/10">
                  SAVE CHANGES
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEdit(null)} className="px-8 bg-white/5 border-white/5 text-white font-black py-4 h-auto rounded-2xl">
                  CANCEL
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY: NEW ROUND (Create Modal) */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCreate(false)} />
          <div className="relative card rounded-3xl border-[#1A1A1A]/10 dark:border-white/10 p-8 w-full max-w-lg animate-bounce-in">
            <h3 className="text-2xl font-black text-[#1A1A1A] dark:text-white italic uppercase mb-6 tracking-tighter">Create New Round</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase mb-2">ROUND NAME</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full px-4 py-4 text-lg font-bold"
                    placeholder="e.g. Qualification Round"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase mb-2">TIMER DURATION (MIN)</label>
                    <input
                      type="number"
                      value={timer || ''}
                      onChange={(e) => setTimer(Number(e.target.value))}
                      className="input w-full px-4 py-4 text-lg font-bold"
                      placeholder="Minutes"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase mb-2">JUDGING WINDOW</label>
                    <input
                      type="number"
                      value={judgingWindow || ''}
                      onChange={(e) => setJudgingWindow(e.target.value === '' ? null : Number(e.target.value))}
                      className="input w-full px-4 py-4 text-lg font-bold"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-grow bg-[#1A1A1A] dark:bg-white text-white dark:text-black hover:bg-[#1A1A1A]/80 dark:hover:bg-slate-200 font-black py-4 h-auto rounded-2xl transition-all text-lg shadow-xl">
                  INITIALIZE MODULE
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="px-8 bg-[#1A1A1A]/5 dark:bg-white/5 border-[#1A1A1A]/5 dark:border-white/5 text-[#1A1A1A] dark:text-white font-black py-4 h-auto rounded-2xl">
                  ABORT
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default AdminRoundsPage;
