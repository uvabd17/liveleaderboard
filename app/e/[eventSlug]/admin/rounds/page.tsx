"use client"
import Card from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventNavigation } from '@/components/event-navigation';
import Link from 'next/link';
import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    fetchRounds(eventSlug)
      .then((data) => setCurrentRoundIdx(data.currentRound ?? 0))
      .catch(()=>{})
  }, [eventSlug])

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createOrUpdateRound(eventSlug, {
        number: rounds.length,
        name,
        roundDurationMinutes: timer,
      });
      setRounds(res.rounds || []);
      setName("");
      setTimer(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRound = (idx: number) => {
    setEdit({ idx, name: rounds[idx].name, timer: rounds[idx].roundDurationMinutes });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createOrUpdateRound(eventSlug, {
        number: edit.idx,
        name: edit.name,
        roundDurationMinutes: edit.timer,
      });
      setRounds(res.rounds || []);
      setEdit(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRound = async (idx: number) => {
    setLoading(true);
    setError(null);
    try {
      // Remove round at idx and update config
      const newRounds = rounds.filter((_, i) => i !== idx);
      // Re-upload all rounds with new indices
      for (let i = 0; i < newRounds.length; i++) {
        await createOrUpdateRound(eventSlug, {
          number: i,
          name: newRounds[i].name,
          roundDurationMinutes: newRounds[i].roundDurationMinutes,
        });
      }
      setRounds(newRounds);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  async function postRoundsAction(payload: any) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, eventSlug }),
      })
      if (!res.ok) throw new Error('Action failed')
      const data = await res.json()
      setRounds(data.rounds || [])
      setCurrentRoundIdx(data.currentRound ?? currentRoundIdx)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function exportCsv(roundNumber?: number) {
    setLoading(true)
    try {
      const targetDesc = roundNumber !== undefined ? `round ${roundNumber}` : 'all rounds'
      const filters: string[] = []
      if (participantFilter) filters.push(`participant=${participantFilter}`)
      if (judgeFilter) filters.push(`judge=${judgeFilter}`)
      const filterDesc = filters.length ? ` with ${filters.join(' & ')}` : ''
      const ok = confirm(`Download CSV for ${targetDesc}${filterDesc}?`)
      if (!ok) return

      const params = new URLSearchParams()
      if (roundNumber !== undefined) params.set('roundNumber', String(roundNumber))
      params.set('format', 'csv')
      if (participantFilter) params.set('participantId', participantFilter)
      if (judgeFilter) params.set('judgeUserId', judgeFilter)
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
    } catch (e) {
      setError((e as any)?.message || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrent = (idx: number) => {
    postRoundsAction({ action: 'set', roundNumber: idx })
  }

  const handleNext = () => postRoundsAction({ action: 'next' })
  const handlePrev = () => postRoundsAction({ action: 'prev' })

  const handleOpenJudging = (idx: number, windowMinutes: number | null = null) => {
    postRoundsAction({ action: 'judging', judging: { roundNumber: idx, open: true, windowMinutes } })
  }

  const handleCloseJudging = (idx: number) => {
    postRoundsAction({ action: 'judging', judging: { roundNumber: idx, open: false } })
  }

  return (
    <>
      <EventNavigation />
      <main className="min-h-screen bg-slate-900 py-8 px-2 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center gap-2">
            <Link href={`/e/${eventSlug}/admin`} className="text-slate-400 hover:text-white flex items-center gap-1 font-medium">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-white ml-4">Manage Rounds</h1>
          </div>
          <Card className="mb-8 bg-slate-800 border-slate-700">
            {edit ? (
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <label className="text-slate-300 text-sm">Round Name</label>
                <input
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Round Name"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  required
                />
                <label className="text-slate-300 text-sm">Timer (minutes)</label>
                <input
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  type="number"
                  min={0}
                  placeholder="Timer (minutes)"
                  value={edit.timer}
                  onChange={(e) => setEdit({ ...edit, timer: Number(e.target.value) })}
                  required
                />
                <div className="flex gap-2 mt-2">
                  <Button type="submit" variant="default" disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEdit(null)} disabled={loading}>
                    Cancel
                  </Button>
                </div>
                {error && <div className="text-red-400 mt-2">{error}</div>}
              </form>
            ) : (
              <form onSubmit={handleCreateRound} className="flex flex-col gap-4">
                <label className="text-slate-300 text-sm">Round Name</label>
                <input
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Round Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <label className="text-slate-300 text-sm">Timer (minutes)</label>
                <input
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  type="number"
                  min={0}
                  placeholder="Timer (minutes)"
                  value={timer}
                  onChange={(e) => setTimer(Number(e.target.value))}
                  required
                />
                <Button type="submit" variant="default" disabled={loading}>
                  {loading ? "Creating..." : "Create Round"}
                </Button>
                {error && <div className="text-red-400 mt-2">{error}</div>}
              </form>
            )}
          </Card>
          {selectedCompletions !== null && (
            <Card className="mt-6 bg-slate-800 border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-2">Round Completions</h3>
              {completionsLoading ? (
                <div className="text-slate-400">Loading…</div>
              ) : selectedCompletions.length === 0 ? (
                <div className="text-slate-400">No completions yet for this round.</div>
              ) : (
                <ul className="space-y-2">
                  {selectedCompletions.map((c: any) => (
                    <li key={c.id} className="flex justify-between text-sm text-white/90">
                      <div>{c.participantId}</div>
                      <div className="text-slate-400">{c.judgeUserId} · {new Date(c.completedAt).toLocaleString()} · {c.durationSeconds ?? '-'}s</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          <Card className="bg-slate-800 border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Rounds</h2>
            <div className="mb-4 flex gap-2 items-center">
              <Button variant="default" size="sm" onClick={() => exportCsv(undefined)} disabled={loading}>Export All CSV</Button>
              <input placeholder="participantId filter" value={participantFilter} onChange={(e) => setParticipantFilter(e.target.value)} className="px-2 py-1 bg-slate-700 border border-slate-600 text-sm text-white rounded" />
              <input placeholder="judgeUserId filter" value={judgeFilter} onChange={(e) => setJudgeFilter(e.target.value)} className="px-2 py-1 bg-slate-700 border border-slate-600 text-sm text-white rounded" />
            </div>
            {rounds.length === 0 ? (
              <p className="text-slate-400">No rounds created yet.</p>
            ) : (
              <ul className="space-y-3">
                {rounds.map((round, idx) => {
                  const timeLeft = timers[idx] ?? (round.roundDurationMinutes * 60);
                  const min = Math.floor(timeLeft / 60);
                  const sec = timeLeft % 60;
                  return (
                    <li key={idx} className="flex flex-col md:flex-row md:justify-between md:items-center bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <div>
                        <span className="font-semibold text-white">{round.name}</span>
                        <span className="text-slate-400 ml-2">({round.roundDurationMinutes} min)</span>
                        {currentRoundIdx === idx && (
                          <span className="ml-3 inline-block px-2 py-1 text-xs bg-green-700 text-white rounded">Current</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 md:mt-0">
                        <span className="text-sm text-slate-400">Duration: {round.roundDurationMinutes} min</span>
                        <Button variant="ghost" size="sm" onClick={() => handleEditRound(idx)} disabled={loading}>Edit</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleSetCurrent(idx)} disabled={loading}>Set Current / Start</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenJudging(idx, round.judgingWindowMinutes ?? null)} disabled={loading}>Open Judging</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCloseJudging(idx)} disabled={loading}>Close Judging</Button>
                        <Button variant="ghost" size="sm" onClick={async () => { await postRoundsAction({ action: 'pause', roundNumber: idx }) }} disabled={loading}>Pause</Button>
                        <Button variant="ghost" size="sm" onClick={async () => { await postRoundsAction({ action: 'resume', roundNumber: idx }) }} disabled={loading}>Resume</Button>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          setCompletionsLoading(true)
                          try {
                            const params = new URLSearchParams()
                            params.set('roundNumber', String(idx))
                            if (participantFilter) params.set('participantId', participantFilter)
                            if (judgeFilter) params.set('judgeUserId', judgeFilter)
                            const res = await fetch(`/api/events/${eventSlug}/round-completions?${params.toString()}`)
                            const json = await res.json()
                            setSelectedCompletions(json.rows || [])
                          } catch (e) {
                            setSelectedCompletions([])
                          } finally {
                            setCompletionsLoading(false)
                          }
                        }} disabled={loading}>View Completions</Button>
                        <Button variant="ghost" size="sm" onClick={async () => { await exportCsv(idx) }} disabled={loading}>Export CSV</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteRound(idx)} disabled={loading}>Delete</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </>
  );
};

export default AdminRoundsPage;
