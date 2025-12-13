"use client"

export const dynamic = 'force-dynamic'
import React from 'react'
import { ProtectedPage } from '../../lib/protected-page'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth-context'

type Participant = { id: string; name: string; kind: 'team' | 'individual'; score: number }
type Criterion = { key: string; label: string; max: number; weight?: number; description?: string; rounds?: number[] | null; required?: boolean; scale?: 'number' | 'radio' | 'range' }
const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'innovation', label: 'Innovation', max: 100 },
  { key: 'impact', label: 'Impact', max: 100 },
  { key: 'technical', label: 'Technical', max: 100 },
]

function JudgeConsoleContent() {
  const [rows, setRows] = React.useState<Participant[]>([])
  const [selected, setSelected] = React.useState<string>('')
  const [criteria, setCriteria] = React.useState<Criterion[]>(DEFAULT_CRITERIA)
  const [values, setValues] = React.useState<Record<string, number>>({ innovation: 0, impact: 0, technical: 0 })
  const [comments, setComments] = React.useState<Record<string, string>>({})
  const [generalComment, setGeneralComment] = React.useState<string>('')
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [features, setFeatures] = React.useState<any>(null)
  const [judgingMode, setJudgingMode] = React.useState<'blinded'|'aggregateVisible'>('aggregateVisible')
  const [judgeInfo, setJudgeInfo] = React.useState<{ id?: string; name?: string; role?: string } | null>(null)
  const [judgingOpen, setJudgingOpen] = React.useState<boolean>(true)
  const [judgingWindowMinutes, setJudgingWindowMinutes] = React.useState<number|null>(null)
  const [judgingOpenedAt, setJudgingOpenedAt] = React.useState<string|null>(null)
  const [now, setNow] = React.useState<number>(Date.now())
  const [currentRound, setCurrentRound] = React.useState<number>(0)
  const [selectedCompleted, setSelectedCompleted] = React.useState<boolean>(false)
  const [roundsConfig, setRoundsConfig] = React.useState<any[]>([])
  const [selectedRoundNumber, setSelectedRoundNumber] = React.useState<number>(1)

  React.useEffect(() => {
    const es = new EventSource('/api/sse')
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload.type === 'snapshot' || payload.type === 'leaderboard') {
          setRows((payload.leaderboard || []).map((r: any) => ({ id: r.id, name: r.name, kind: r.kind, score: r.score })))
        }
        if (payload.type === 'round-change') {
          const cr = payload.currentRound ?? 0
          setCurrentRound(cr)
          const cfg = Array.isArray(payload.roundsConfig) ? payload.roundsConfig[cr] : null
          setJudgingOpen(cfg?.judgingOpen ?? true)
          setJudgingWindowMinutes(cfg?.judgingWindowMinutes ?? null)
          setJudgingOpenedAt(cfg?.judgingOpenedAt ?? null)
        }
      } catch {}
    }

    fetch('/api/event/settings').then(r=>r.json()).then(d=>{ 
      if (d?.judgingMode) setJudgingMode(d.judgingMode)
      if (d?.features) setFeatures(d.features)
    }).catch(()=>{})

    fetch('/api/scoring-schema').then(r=>r.json()).then(d=>{
      if (Array.isArray(d?.rubric) && d.rubric.length>0) {
        setCriteria(d.rubric)
        setValues(prev=>{
          const next: Record<string, number> = {}
          for (const c of d.rubric) next[c.key] = prev[c.key] ?? 0
          return next
        })
      }
    }).catch(()=>{})

    fetch('/api/rounds').then(r=>r.json()).then(d=>{
      const cr = d?.currentRound ?? 0
      setCurrentRound(cr)
      setRoundsConfig(Array.isArray(d?.rounds) ? d.rounds : [])
      setSelectedRoundNumber((d?.currentRound ?? 0) + 1)
      const cfg = Array.isArray(d?.rounds) ? d.rounds[cr] : null
      setJudgingOpen(cfg?.judgingOpen ?? true)
      setJudgingWindowMinutes(cfg?.judgingWindowMinutes ?? null)
      setJudgingOpenedAt(cfg?.judgingOpenedAt ?? null)
    }).catch(()=>{})

    try {
      const raw = localStorage.getItem('judgeInfo')
      if (raw) setJudgeInfo(JSON.parse(raw))
    } catch {}

    return () => es.close()
  }, [])

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  React.useEffect(() => {
    if (!selected) {
      setSelectedCompleted(false)
      return
    }
    fetch(`/api/judge/score?participantId=${selected}&roundNumber=${selectedRoundNumber}`).then(r => r.json()).then(d => {
      setSelectedCompleted(!!d.completedCurrentRound)
    }).catch(()=>{})
  }, [selected, selectedRoundNumber])

  async function submit() {
    if (!selected) return
    if (selectedCompleted) {
      toast.error('Participant already completed this round')
      return
    }
    const judgeUserId = judgeInfo?.id || judgeInfo?.name || 'unknown-judge'
    const missing: string[] = []
    for (const c of criteria) {
      const req = c.required !== false
      if (req && (values[c.key] === undefined || values[c.key] === null || isNaN(values[c.key] as any))) {
        missing.push(c.label)
      }
    }
    if (missing.length > 0) {
      toast.error(
        <div>
          <div className="font-bold">Missing Required Criteria:</div>
          {missing.map(m => <div key={m} className="text-sm">• {m}</div>)}
        </div>,
        { duration: 4000 }
      )
      return
    }
    setStatus('saving')
    const scoresObj: Record<string, number> = {}
    for (const c of criteria) scoresObj[c.key] = values[c.key] ?? 0
    const res = await fetch('/api/judge/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: selected, scores: scoresObj, generalComment: generalComment || null, idempotency_key: (crypto as any).randomUUID(), judgeUserId, roundNumber: selectedRoundNumber })
    })
    if (res.ok) {
      setStatus('saved')
      setSelectedCompleted(true)
      toast.success('✅ Scores submitted successfully!')
      setComments({})
      setGeneralComment('')
      setTimeout(()=>setStatus('idle'), 2000)
    } else {
      setStatus('error')
      const data = await res.json().catch(()=> ({}))
      const reason = data?.error === 'judging_closed'
        ? 'Judging is closed for this event.'
        : 'Failed to submit scores'
      toast.error(reason)
      setTimeout(()=>setStatus('idle'), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">⚖️ Judge Console</h1>
          {judgeInfo && (
            <p className="text-slate-400">
              Judge: <span className="font-semibold text-blue-400">{judgeInfo.name || judgeInfo.id}</span>
            </p>
          )}
          {!judgeInfo && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ Not verified. <a href="/judge/access" className="underline hover:text-yellow-300">Verify judge access</a>
              </p>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${judgingOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-white font-medium">
                  {judgingOpen ? 'Judging Open' : 'Judging Closed'}
                </span>
              </div>
              <div className="text-slate-400">•</div>
              <div className="text-slate-300">
                Round {selectedRoundNumber}
              </div>
              <div className="text-slate-400">•</div>
              <div className="text-slate-300">
                Mode: {judgingMode === 'aggregateVisible' ? 'Visible' : 'Blinded'}
              </div>
            </div>
            {(() => {
              if (!judgingOpen || !judgingWindowMinutes || !judgingOpenedAt) return null
              const start = new Date(judgingOpenedAt).getTime()
              const end = start + (judgingWindowMinutes * 60 * 1000)
              const remainingMs = Math.max(0, end - now)
              const mins = Math.floor(remainingMs / 60000)
              const secs = Math.floor((remainingMs % 60000) / 1000)
              const isLowTime = mins < 5
              return (
                <div className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${isLowTime ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-700 text-white'}`}>
                  ⏱️ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </div>
              )
            })()}
          </div>
        </Card>

        {/* Participant Selection */}
        <Card className="mb-6">
          <label htmlFor="participant-select" className="block text-lg font-bold text-white mb-4">
            1️⃣ Select Participant to Score
          </label>
          <select
            id="participant-select"
            value={selected}
            onChange={e => {
              setSelected(e.target.value)
              setStatus('idle')
            }}
            className="w-full px-6 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl text-white text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-slate-500 transition-all"
            disabled={!judgingOpen}
          >
            <option value="">-- Choose a participant --</option>
            {rows.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.kind})
              </option>
            ))}
          </select>
          {selected && (
            <p className="text-sm mt-2">
              {selectedCompleted ? <span className="text-green-400 font-semibold">✅ Completed this round</span> : <span className="text-yellow-300">Not completed</span>}
            </p>
          )}
          {rows.length === 0 && (
            <p className="text-sm text-slate-400 mt-2">No participants available yet</p>
          )}
        </Card>

        {/* Scoring Criteria */}
        {selected && (
          <Card className="mb-6">
            <h2 className="text-xl font-bold text-white mb-6">2️⃣ Score Each Criterion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {criteria
                .filter(c => {
                      if (Array.isArray(c.rounds)) {
                        return c.rounds.includes(selectedRoundNumber)
                      }
                      return true
                    })
                .map(c => (
                  <Card key={c.key} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">
                          {c.label}
                          {c.required !== false && <span className="text-red-400 ml-1">*</span>}
                        </h3>
                        {c.description && (
                          <p className="text-sm text-slate-400 mt-1">{c.description}</p>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 ml-2 whitespace-nowrap">
                        Max: <span className="font-bold text-blue-400">{c.max}</span>
                      </div>
                    </div>

                    {(!c.scale || c.scale === 'number') && (
                      <div>
                        <input
                          type="number"
                          min={0}
                          max={c.max}
                          value={values[c.key] ?? 0}
                          onChange={e => setValues(v => ({ ...v, [c.key]: Math.max(0, Math.min(c.max, Number(e.target.value))) }))}
                          className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-600 rounded-lg text-white text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <input
                          type="range"
                          min={0}
                          max={c.max}
                          value={values[c.key] ?? 0}
                          onChange={e => setValues(v => ({ ...v, [c.key]: Number(e.target.value) }))}
                          className="w-full mt-3"
                        />
                      </div>
                    )}

                    {c.scale === 'range' && (
                      <input
                        type="range"
                        min={0}
                        max={c.max}
                        value={values[c.key] ?? 0}
                        onChange={e => setValues(v => ({ ...v, [c.key]: Number(e.target.value) }))}
                        className="w-full"
                      />
                    )}

                    {c.scale === 'radio' && (
                      <div className="flex flex-wrap gap-2">
                        {[0, Math.round(c.max * 0.25), Math.round(c.max * 0.5), Math.round(c.max * 0.75), c.max].map(val => (
                          <button
                            key={val}
                            onClick={() => setValues(v => ({ ...v, [c.key]: val }))}
                            className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                              (values[c.key] ?? 0) === val
                                ? 'bg-blue-500 text-white scale-105'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}

                    {features?.judgeExperience?.judgeComments && (
                      <textarea
                        placeholder="Optional feedback for this criterion..."
                        value={comments[c.key] || ''}
                        onChange={e => setComments(prev => ({ ...prev, [c.key]: e.target.value }))}
                        className="w-full mt-4 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                        rows={2}
                      />
                    )}
                  </Card>
                ))}
            </div>
          </Card>
        )}

        {/* General Feedback */}
        {selected && features?.judgeExperience?.judgeComments && (
          <Card className="mb-6">
            <label className="block text-lg font-bold text-white mb-3">
              3️⃣ General Feedback (Optional)
            </label>
            <textarea
              placeholder="Overall comments for this participant..."
              value={generalComment}
              onChange={e => setGeneralComment(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              rows={4}
            />
          </Card>
        )}

        {/* Submit Button */}
        {selected && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30">
            <Button
              onClick={submit}
              disabled={!selected || status === 'saving' || !judgingOpen}
              className="w-full py-6 text-xl font-bold"
              size="lg"
            >
              {status === 'saving' ? '💾 Submitting Scores...' : !judgingOpen ? '🔒 Judging Closed' : '✅ Submit All Scores'}
            </Button>
            {!judgingOpen && (
              <p className="text-sm text-yellow-400 mt-3 text-center">
                Judging is currently closed for this round
              </p>
            )}
            {status === 'saved' && (
              <p className="text-sm text-green-400 mt-3 text-center font-medium">
                ✅ Scores saved successfully!
              </p>
            )}
          </Card>

        {/* Round selector */}
        {roundsConfig.length > 0 && (
          <div className="mb-6">
            <label className="text-sm text-slate-400 mr-2">Scoring Round</label>
            <select value={selectedRoundNumber} onChange={e => setSelectedRoundNumber(Number(e.target.value))} className="bg-slate-800 text-white px-3 py-2 rounded">
              {roundsConfig.map((r, i) => (
                <option key={i} value={i + 1}>{r.name || `Round ${i + 1}`}</option>
              ))}
            </select>
          </div>
        )}
        )}

        {/* Preview Leaderboard */}
        {judgingMode === 'aggregateVisible' && rows.length > 0 && (
          <Card className="mt-6">
            <h3 className="text-lg font-bold text-white mb-4">📊 Current Standings</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    r.id === selected ? 'bg-blue-500/20 border border-blue-500/40' : 'bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <span className="text-white font-medium">{r.name}</span>
                    <span className="text-xs text-slate-400 capitalize">({r.kind})</span>
                  </div>
                  <span className="text-xl font-bold text-blue-400 tabular-nums">{r.score}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function JudgePage() {
  return (
    <ProtectedPage requiredRole="judge">
      <JudgeConsoleContent />
    </ProtectedPage>
  )
}