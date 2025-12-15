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
        const normalized = d.rubric.map((r: any) => ({ ...r, rounds: Array.isArray(r.rounds) ? r.rounds.map((v: any) => Number(v)) : null }))
        setCriteria(normalized)
        setValues(prev=>{
          const next: Record<string, number> = {}
          for (const c of normalized) next[c.key] = prev[c.key] ?? 0
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
    <div>Test</div>
  )
}

export default function JudgePage() {
  return (
    <ProtectedPage requiredRole="judge">
      <JudgeConsoleContent />
    </ProtectedPage>
  )
}
