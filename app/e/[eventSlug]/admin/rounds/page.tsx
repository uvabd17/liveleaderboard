"use client"

import React, { useEffect, useState } from "react";
import toast from 'react-hot-toast'
import Link from 'next/link';
import { EventNavigation } from '@/components/event-navigation';
import { CircularTimerControl } from '@/components/circular-timer-control';
import { Button } from '@/components/ui/button';
import { 
  Plus, Clock, Users, Play, Pause, Lock, Unlock,
  Settings, Trash2, Download, Send, Timer, ChevronRight
} from 'lucide-react';

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

export default function AdminRoundsPage({ params }: { params: { eventSlug: string } }) {
  const { eventSlug } = params;
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0)
  const [eventData, setEventData] = useState<any>(null)
  const [participantsCount, setParticipantsCount] = useState<number>(0)
  const [completedCount, setCompletedCount] = useState<number>(0)

  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<EditState>(null);
  const [showCreate, setShowCreate] = useState(false)
  
  // Create form states
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundTimer, setNewRoundTimer] = useState(0);

  // Broadcast states
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'urgent'>('info')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

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
        toast.error(e.message)
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

      toast.success('Updated')
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
    await postAction({ action: 'set', roundNumber: idx })
  }

  const handleOpenJudging = (idx: number, windowMinutes: number | null = null) => {
    postAction({ action: 'judging', judging: { roundNumber: idx, open: true, windowMinutes } })
  }

  const handleCloseJudging = (idx: number) => {
    postAction({ action: 'judging', judging: { roundNumber: idx, open: false } })
  }

  const handleDeleteRound = (idx: number) => {
    if (!confirm('Delete this round? This cannot be undone.')) return
    postAction({ action: 'delete', roundNumber: idx })
  }

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoundName.trim()) return toast.error("Name is required")
    setLoading(true)
    try {
      await createOrUpdateRound(eventSlug, { 
        number: rounds.length, 
        name: newRoundName, 
        roundDurationMinutes: newRoundTimer 
      })
      setNewRoundName('')
      setNewRoundTimer(0)
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
      await createOrUpdateRound(eventSlug, { 
        number: edit.idx, 
        name: edit.name, 
        roundDurationMinutes: edit.timer, 
        judgingWindowMinutes: edit.judgingWindowMinutes 
      })
      setEdit(null)
      await refreshRounds()
      toast.success('Saved')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return
    setSendingBroadcast(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug, message: broadcastMessage, type: broadcastType })
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

  const activeRound = rounds[currentRoundIdx] || null

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal pt-20">
      <EventNavigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-charcoal dark:text-white">Rounds & Timer</h1>
            <p className="text-charcoal/60 dark:text-white/60 mt-1">Manage competition rounds and control live timers</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-charcoal dark:bg-white text-cream dark:text-charcoal hover:bg-charcoal/90 dark:hover:bg-white/90"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Round
          </Button>
        </div>

        {rounds.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-charcoal/10 dark:bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Timer className="w-8 h-8 text-charcoal/40 dark:text-white/40" />
            </div>
            <h3 className="text-xl font-bold text-charcoal dark:text-white mb-2">No Rounds Yet</h3>
            <p className="text-charcoal/60 dark:text-white/60 max-w-md mx-auto mb-6">
              Create your first round to start managing your competition timeline and judging windows.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-charcoal dark:bg-white text-cream dark:text-charcoal"
            >
              <Plus className="w-4 h-4 mr-2" /> Create First Round
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Round List */}
            <div className="lg:col-span-1 space-y-3">
              <div className="text-xs font-medium text-charcoal/50 dark:text-white/50 uppercase tracking-wider mb-2">
                All Rounds ({rounds.length})
              </div>
              
              {rounds.map((round, idx) => {
                const isActive = idx === currentRoundIdx
                const isJudgingOpen = round.judgingOpen
                const isTimerRunning = round.timerRunning
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleSetCurrent(idx)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-charcoal dark:bg-white text-cream dark:text-charcoal border-charcoal dark:border-white'
                        : 'bg-white dark:bg-gray-900 text-charcoal dark:text-white border-charcoal/10 dark:border-white/10 hover:border-charcoal/30 dark:hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isActive 
                            ? 'bg-cream/20 dark:bg-charcoal/20' 
                            : 'bg-charcoal/10 dark:bg-white/10'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-semibold truncate">{round.name}</span>
                      </div>
                      {isActive && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cream/20 dark:bg-charcoal/20">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs">
                      <div className={`flex items-center gap-1 ${isActive ? 'opacity-80' : 'text-charcoal/50 dark:text-white/50'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{round.roundDurationMinutes || 0}min</span>
                      </div>
                      {isJudgingOpen && (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <Unlock className="w-3 h-3" />
                          <span>Judging</span>
                        </div>
                      )}
                      {isTimerRunning && (
                        <div className="flex items-center gap-1 text-blue-500">
                          <Play className="w-3 h-3" />
                          <span>Live</span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Right Column: Active Round Control */}
            <div className="lg:col-span-2 space-y-6">
              {activeRound ? (
                <>
                  {/* Timer Control Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-sm text-charcoal/50 dark:text-white/50 mb-1">Round {currentRoundIdx + 1}</div>
                        <h2 className="text-2xl font-bold text-charcoal dark:text-white">{activeRound.name}</h2>
                      </div>
                      <button
                        onClick={() => setEdit({
                          idx: currentRoundIdx,
                          name: activeRound.name,
                          timer: activeRound.roundDurationMinutes,
                          judgingWindowMinutes: activeRound.judgingWindowMinutes ?? null
                        })}
                        className="p-2 rounded-xl bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 transition-colors"
                      >
                        <Settings className="w-5 h-5 text-charcoal/60 dark:text-white/60" />
                      </button>
                    </div>

                    {/* Timer Display */}
                    <div className="flex items-center justify-center mb-6">
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

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-xl bg-charcoal/5 dark:bg-white/5 text-center">
                        <div className="text-2xl font-bold text-charcoal dark:text-white">{activeRound.roundDurationMinutes || 0}</div>
                        <div className="text-xs text-charcoal/50 dark:text-white/50">Duration (min)</div>
                      </div>
                      <div className="p-3 rounded-xl bg-charcoal/5 dark:bg-white/5 text-center">
                        <div className="text-2xl font-bold text-charcoal dark:text-white">{completedCount}/{participantsCount}</div>
                        <div className="text-xs text-charcoal/50 dark:text-white/50">Scored</div>
                      </div>
                      <div className="p-3 rounded-xl bg-charcoal/5 dark:bg-white/5 text-center">
                        <div className="text-2xl font-bold text-charcoal dark:text-white">
                          {activeRound.judgingWindowMinutes || '∞'}
                        </div>
                        <div className="text-xs text-charcoal/50 dark:text-white/50">Judge Window</div>
                      </div>
                    </div>
                  </div>

                  {/* Judging Control Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-4">Judging Portal</h3>
                    
                    <div className="flex items-center justify-between p-4 rounded-xl bg-charcoal/5 dark:bg-white/5 mb-4">
                      <div className="flex items-center gap-3">
                        {activeRound.judgingOpen ? (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                              <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <div className="font-medium text-charcoal dark:text-white">Judging is Open</div>
                              <div className="text-sm text-charcoal/60 dark:text-white/60">Judges can submit scores</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-charcoal/10 dark:bg-white/10 flex items-center justify-center">
                              <Lock className="w-5 h-5 text-charcoal/60 dark:text-white/60" />
                            </div>
                            <div>
                              <div className="font-medium text-charcoal dark:text-white">Judging is Closed</div>
                              <div className="text-sm text-charcoal/60 dark:text-white/60">Judges cannot submit scores</div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => activeRound.judgingOpen 
                          ? handleCloseJudging(currentRoundIdx) 
                          : handleOpenJudging(currentRoundIdx, activeRound.judgingWindowMinutes)
                        }
                        className={activeRound.judgingOpen
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }
                      >
                        {activeRound.judgingOpen ? (
                          <><Lock className="w-4 h-4 mr-2" /> Close Judging</>
                        ) : (
                          <><Unlock className="w-4 h-4 mr-2" /> Open Judging</>
                        )}
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-charcoal/60 dark:text-white/60">Scoring Progress</span>
                        <span className="font-medium text-charcoal dark:text-white">
                          {participantsCount > 0 ? Math.round((completedCount / participantsCount) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-charcoal/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${participantsCount > 0 ? (completedCount / participantsCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      href={`/api/admin/export?eventSlug=${eventSlug}`}
                      target="_blank"
                      className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-900 border border-charcoal/10 dark:border-white/10 rounded-xl hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors text-charcoal dark:text-white font-medium"
                    >
                      <Download className="w-5 h-5" />
                      Export Results
                    </Link>
                    <button
                      onClick={() => handleDeleteRound(currentRoundIdx)}
                      className="flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors text-red-600 dark:text-red-400 font-medium"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete Round
                    </button>
                  </div>

                  {/* Broadcast Section */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-4">Send Announcement</h3>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type a message to broadcast to all screens..."
                      className="w-full h-20 p-3 bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/10 rounded-xl text-charcoal dark:text-white placeholder-charcoal/40 dark:placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                    />
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex gap-2">
                        {(['info', 'warning', 'urgent'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setBroadcastType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              broadcastType === type
                                ? type === 'info' ? 'bg-blue-500 text-white'
                                : type === 'warning' ? 'bg-yellow-500 text-white'
                                : 'bg-red-500 text-white'
                                : 'bg-charcoal/10 dark:bg-white/10 text-charcoal/60 dark:text-white/60'
                            }`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                      <Button
                        onClick={handleSendBroadcast}
                        disabled={sendingBroadcast || !broadcastMessage.trim()}
                        className="ml-auto bg-charcoal dark:bg-white text-cream dark:text-charcoal"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendingBroadcast ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-12 text-center">
                  <p className="text-charcoal/60 dark:text-white/60">Select a round from the left to manage it</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Round Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-cream dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-charcoal dark:text-white mb-4">Create New Round</h3>
            <form onSubmit={handleCreateRound} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Round Name
                </label>
                <input
                  type="text"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                  placeholder="e.g., Semifinals"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Timer Duration (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newRoundTimer || ''}
                  onChange={(e) => setNewRoundTimer(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                  placeholder="Leave empty for no timer"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreate(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-charcoal dark:bg-white text-cream dark:text-charcoal"
                >
                  {loading ? 'Creating...' : 'Create Round'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Round Modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEdit(null)} />
          <div className="relative bg-cream dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-charcoal dark:text-white mb-4">Edit Round {edit.idx + 1}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Round Name
                </label>
                <input
                  type="text"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Timer Duration (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={edit.timer || ''}
                  onChange={(e) => setEdit({ ...edit, timer: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Judging Window (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={edit.judgingWindowMinutes ?? ''}
                  onChange={(e) => setEdit({ ...edit, judgingWindowMinutes: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEdit(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-charcoal dark:bg-white text-cream dark:text-charcoal"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
