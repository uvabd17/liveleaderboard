"use client"
import Card from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventNavigation } from '@/components/event-navigation';
import { CircularTimerControl } from '@/components/circular-timer-control';
import Link from 'next/link';
import React, { useEffect, useState } from "react";
import toast from 'react-hot-toast'

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


const AdminRoundsPage = ({ params }: { params: { eventSlug: string } }) => {
  const { eventSlug } = params;
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0)
  const [name, setName] = useState("");
  const [timer, setTimer] = useState(0);
  const [judgingWindow, setJudgingWindow] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>(null);
  const [timers, setTimers] = useState<{ [idx: number]: number }>({});
  const [selectedCompletions, setSelectedCompletions] = useState<any[] | null>(null);
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [participantFilter, setParticipantFilter] = useState<string>('')
  const [judgeFilter, setJudgeFilter] = useState<string>('')
  // Admin no longer controls per-round running timers here.
  // Timers are started globally; only store/display configured duration.

  useEffect(() => {
    fetchRounds(eventSlug)
      .then((data) => setRounds(data.rounds || []))
      .catch((e) => setError(e.message));
  }, [eventSlug]);

  // helper to refresh rounds
  const refreshRounds = async () => {
    setLoading(true)
    try {
      const data = await fetchRounds(eventSlug)
      setRounds(data.rounds || [])
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const postRoundsAction = async (payload: any) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, eventSlug }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Action failed')
      // Update rounds and current round from response when present
      if (json?.rounds) setRounds(json.rounds)
      if (typeof json?.currentRound === 'number') setCurrentRoundIdx(json.currentRound)
      // Show user-friendly toast feedback
      try {
        const a = (payload && payload.action) || 'saved'
        if (a === 'set') toast.success('Round activated')
        else if (a === 'next') toast.success('Advanced to next round')
        else if (a === 'prev') toast.success('Moved to previous round')
        else if (a === 'judging') toast.success('Judging state updated')
        else if (a === 'pause') toast.success('Timer paused')
        else if (a === 'resume') toast.success('Timer resumed')
        else if (a === 'delete') toast.success('Round deleted')
        else toast.success('Saved')
      } catch {}
      return json
    } catch (e: any) {
      setError(e?.message || String(e))
      throw e
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = async (roundNumber?: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (typeof roundNumber === 'number') params.set('roundNumber', String(roundNumber))
      const res = await fetch(`/api/events/${eventSlug}/round-completions?${params.toString()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = roundNumber !== undefined ? `${eventSlug}-round-${roundNumber}-completions.csv` : `${eventSlug}-round-completions.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrent = async (idx: number) => {
    // optimistic UI: mark active immediately
    const prev = currentRoundIdx
    setCurrentRoundIdx(idx)
    try {
      await postRoundsAction({ action: 'set', roundNumber: idx })
    } catch (e) {
      // revert on error and refresh actual state
      await refreshRounds()
      setCurrentRoundIdx(prev)
    }
  }

  const handleNext = () => postRoundsAction({ action: 'next' })
  const handlePrev = () => postRoundsAction({ action: 'prev' })

  const handleOpenJudging = (idx: number, windowMinutes: number | null = null) => {
    postRoundsAction({ action: 'judging', judging: { roundNumber: idx, open: true, windowMinutes } })
  }

  const handleCloseJudging = (idx: number) => {
    postRoundsAction({ action: 'judging', judging: { roundNumber: idx, open: false } })
  }

  const handleEditRound = (idx: number) => {
    const r = rounds[idx]
    setEdit({ idx, name: r.name, timer: r.roundDurationMinutes, judgingWindowMinutes: r.judgingWindowMinutes ?? null })
  }

  const handleDeleteRound = (idx: number) => {
    // backend expected to handle delete action
    if (!confirm('Delete this round?')) return
    postRoundsAction({ action: 'delete', roundNumber: idx })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    setLoading(true)
    setError(null)
    try {
      await createOrUpdateRound(eventSlug, { number: edit.idx, name: edit.name, roundDurationMinutes: edit.timer, judgingWindowMinutes: edit.judgingWindowMinutes })
      setEdit(null)
      await refreshRounds()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createOrUpdateRound(eventSlug, { number: rounds.length, name, roundDurationMinutes: timer, judgingWindowMinutes: judgingWindow })
      setName('')
      setTimer(0)
      setJudgingWindow(null)
      await refreshRounds()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // Render
  return (
    <>
      <EventNavigation />
      <main className="min-h-screen bg-slate-900 py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Header */}
          <div className="flex items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Rounds & Timer</h1>
              <p className="text-slate-400 text-sm">Manage rounds and the single global timer</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={loading || currentRoundIdx <= 0}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={loading || currentRoundIdx >= rounds.length - 1}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Next →
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rounds list */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-white">Rounds</h2>
                  <div className="text-right">
                    <Button variant="outline" size="sm" onClick={() => exportCsv(undefined)} disabled={loading} className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                      Export CSV
                    </Button>
                    <div className="text-xs text-slate-400 mt-1">Exports completions CSV for all rounds. Use per-round Export for single-round reports.</div>
                  </div>
                </div>

                {rounds.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No rounds configured</div>
                ) : (
                  <div className="space-y-3">
                    {rounds.map((round, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                        <div>
                          <div className="text-white font-medium">{round.name}</div>
                          <div className="text-sm text-slate-400">{round.roundDurationMinutes} min • {round.judgingOpen ? 'Judging Open' : 'Judging Closed'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleEditRound(idx)} className="text-xs px-2 py-1">Edit</Button>
                          <Button size="sm" onClick={() => handleSetCurrent(idx)} disabled={loading || currentRoundIdx === idx} className="text-xs px-2 py-1">Activate Round</Button>
                          {round.judgingOpen ? (
                            <Button size="sm" onClick={() => handleCloseJudging(idx)} disabled={loading} className="text-xs px-2 py-1">Close Judging</Button>
                          ) : (
                            <Button size="sm" onClick={() => handleOpenJudging(idx, round.judgingWindowMinutes ?? null)} disabled={loading} className="text-xs px-2 py-1">Open Judging</Button>
                          )}
                          <Button size="sm" onClick={() => handleDeleteRound(idx)} variant="destructive" className="text-xs px-2 py-1">Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: Timer + Create */}
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex flex-col items-center">
                <h3 className="text-sm text-slate-300 mb-2">Current Round Timer</h3>
                {rounds.length > 0 ? (
                  <CircularTimerControl
                    round={rounds[currentRoundIdx]}
                    roundIdx={currentRoundIdx}
                    currentRoundIdx={currentRoundIdx}
                    onStartTimer={() => handleSetCurrent(currentRoundIdx)}
                    onPauseTimer={async () => { await postRoundsAction({ action: 'pause', roundNumber: currentRoundIdx }) }}
                    onResumeTimer={async () => { await postRoundsAction({ action: 'resume', roundNumber: currentRoundIdx }) }}
                    onStopTimer={async () => { await postRoundsAction({ action: 'pause', roundNumber: currentRoundIdx }); await postRoundsAction({ action: 'set', roundNumber: -1 }) }}
                    loading={loading}
                  />
                ) : (
                  <div className="text-slate-400 text-sm">No current round</div>
                )}
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="text-sm text-slate-300 mb-2">{edit ? 'Edit Round' : 'Create Round'}</h3>
                {edit ? (
                  <form onSubmit={handleEditSubmit} className="space-y-2">
                    <input value={edit.name} onChange={(e)=>setEdit({...edit, name:e.target.value})} className="w-full px-2 py-1 bg-slate-700 text-white rounded" />
                    <div className="flex gap-2">
                      <input type="number" value={edit.timer} onChange={(e)=>setEdit({...edit, timer:Number(e.target.value)})} className="w-1/2 px-2 py-1 bg-slate-700 text-white rounded" />
                      <input type="number" value={edit.judgingWindowMinutes||''} onChange={(e)=>setEdit({...edit, judgingWindowMinutes: e.target.value===''?null:Number(e.target.value)})} className="w-1/2 px-2 py-1 bg-slate-700 text-white rounded" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="text-sm">Save</Button>
                      <Button type="button" variant="secondary" onClick={()=>setEdit(null)} className="text-sm">Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCreateRound} className="space-y-2">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Round name</label>
                        <input placeholder="Round name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-2 py-1 bg-slate-700 text-white rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-slate-300 mb-1">Duration (minutes)</label>
                          <input type="number" placeholder="Minutes" value={timer} onChange={(e)=>setTimer(Number(e.target.value))} className="w-full px-2 py-1 bg-slate-700 text-white rounded" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-300 mb-1">Judging window (minutes)</label>
                          <input type="number" placeholder="Judging window" value={judgingWindow||''} onChange={(e)=>setJudgingWindow(e.target.value===''?null:Number(e.target.value))} className="w-full px-2 py-1 bg-slate-700 text-white rounded" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Create</Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default AdminRoundsPage;
