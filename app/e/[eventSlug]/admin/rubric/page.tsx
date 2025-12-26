'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Card from '@/components/ui/card'
import toast from 'react-hot-toast'

type Criterion = {
  key: string
  name?: string
  label: string
  max: number
  weight: number
  description?: string
  rounds?: number[] | null
  required?: boolean
}

const TEMPLATES = [
  { key: 'innovation', label: 'Innovation', max: 100, weight: 1, description: 'Originality and creativity', required: true },
  { key: 'impact', label: 'Impact', max: 100, weight: 1, description: 'Real-world potential and value', required: true },
  { key: 'technical', label: 'Technical Excellence', max: 100, weight: 1, description: 'Quality of implementation', required: true },
  { key: 'presentation', label: 'Presentation', max: 100, weight: 1, description: 'Communication and delivery', required: true },
  { key: 'feasibility', label: 'Feasibility', max: 100, weight: 1, description: 'Realistic and achievable', required: true },
]

export default function EventRubricPage() {
  const params = useParams()
  const router = useRouter()
  const eventSlug = params.eventSlug as string

  const [criteria, setCriteria] = useState<Criterion[]>([])
  type RoundInfo = { number: number; name?: string; roundDurationMinutes?: number; judgingOpen?: boolean }
  const [rounds, setRounds] = useState<RoundInfo[]>([{ number: 1 }])
  const [selectedRound, setSelectedRound] = useState<number | 0>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)
  const [rawRubricJson, setRawRubricJson] = useState<any | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    loadRubric()
      // load available rounds from backend if present
      ; (async () => {
        try {
          const res = await fetch(`/api/rounds?eventSlug=${eventSlug}`)
          if (res.ok) {
            const data = await res.json()
            const fetched = (data.rounds || []).map((r: any, i: number) => ({
              number: i + 1,
              name: r.name,
              roundDurationMinutes: r.roundDurationMinutes,
              judgingOpen: r.judgingOpen,
            }))
            if (fetched.length > 0) setRounds(fetched)
          }
        } catch (err) {
          // ignore — keep local rounds input
        }
      })()
  }, [eventSlug])
  async function loadRubric() {
    setLoading(true)
    try {
      const res = await fetch(`/api/scoring-schema?eventSlug=${encodeURIComponent(eventSlug)}`)
      if (res.ok) {
        const data = await res.json()
        const incoming: any[] = data.rubric || []
        // normalize shape: prefer label, fall back to name, ensure rounds are numbers
        function slugifyName(n: string) {
          return n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        }
        const normalized = incoming.map((r: any, idx: number) => {
          const name = r.name ?? r.label ?? r.key ?? ''
          const key = r.key ?? (name ? slugifyName(name) : `criterion_${Date.now()}_${idx}`)
          const label = r.label ?? r.name ?? r.key ?? '(Untitled)'
          return {
            key,
            name: r.name ?? undefined,
            label,
            max: (r.max ?? r.maxPoints ?? 100) as number,
            weight: r.weight ?? 1,
            description: r.description ?? '',
            rounds: Array.isArray(r.rounds) ? r.rounds.map((v: any) => Number(v)) : null,
            required: r.required !== false,
          }
        })
        setCriteria(normalized)
        setRawRubricJson(data)
      } else {
        setCriteria([])
      }
    } catch (err) {
      setCriteria([])
    } finally {
      setLoading(false)
    }
  }

  function addCriterion(template?: Partial<Criterion>) {
    const newCriterion: Criterion = {
      key: template?.key || `criterion_${Date.now()}`,
      label: template?.label || '',
      max: template?.max ?? 100,
      weight: template?.weight ?? 1,
      description: template?.description,
      rounds: template?.rounds ?? null,
      required: template?.required ?? true,
    }
    setCriteria(prev => [...prev, newCriterion])
    setEditingIndex(criteria.length)
    setShowTemplates(false)
  }

  function updateCriterion(index: number, updates: Partial<Criterion>) {
    setCriteria(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c))
  }

  function removeCriterion(index: number) {
    if (!confirm('Remove this criterion?')) return
    setCriteria(prev => prev.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  function moveCriterion(index: number, direction: 'up' | 'down') {
    setCriteria(prev => {
      const arr = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= arr.length) return prev
        ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return arr
    })
  }

  function toggleRoundForCriterion(index: number, round: number) {
    setCriteria(prev => prev.map((c, i) => {
      if (i !== index) return c
      const existing = c.rounds ? [...c.rounds] : []
      const idx = existing.indexOf(round)
      if (idx === -1) existing.push(round)
      else existing.splice(idx, 1)
      return { ...c, rounds: existing.length ? existing : null }
    }))
  }

  function assignCriterionToRound(index: number, round: number) {
    setCriteria(prev => prev.map((c, i) => {
      if (i !== index) return c
      const existing = c.rounds ? Array.from(new Set([...c.rounds, round])) : [round]
      return { ...c, rounds: existing }
    }))
  }

  function createCriterionForSelectedRound() {
    const r = Number(selectedRound) || 0
    const newCriterion: Criterion = {
      key: `criterion_${Date.now()}`,
      label: 'New Criterion',
      max: 100,
      weight: 1,
      rounds: r > 0 ? [r] : null,
      required: true,
    }
    setCriteria(prev => {
      const next = [...prev, newCriterion]
      setEditingIndex(next.length - 1)
      return next
    })
  }

  function appliesToRound(c: Criterion, roundNumber: number) {
    if (!c.rounds || c.rounds.length === 0) return true
    return c.rounds.includes(roundNumber)
  }

  async function saveRubric() {
    // basic validation
    const errors: string[] = []
    criteria.forEach((c, i) => {
      if (!c.key || c.key.trim().length < 2) errors.push(`Criterion ${i + 1}: Key is too short`)
      if (!c.label || c.label.trim().length < 1) errors.push(`Criterion ${i + 1}: Label is required`)
      if (!c.max || c.max <= 0) errors.push(`Criterion ${i + 1}: Max must be positive`)
    })
    if (errors.length) {
      toast.error(errors.join('\n'))
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/scoring-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug, rubric: criteria })
      })
      if (res.ok) {
        toast.success('Rubric saved')
        await loadRubric()
        setEditingIndex(null)
      } else {
        const err = await res.json()
        toast.error(err?.error || 'Failed to save rubric')
      }
    } catch (err) {
      toast.error('Failed to save rubric')
    } finally {
      setSaving(false)
    }
  }

  // which criteria should be shown given the current edit context
  // keep original indices so edit actions operate on the real array
  const visibleCriteria = (selectedRound && selectedRound > 0)
    ? criteria.map((c, i) => ({ c, i })).filter(({ c }) => appliesToRound(c, selectedRound))
    : criteria.map((c, i) => ({ c, i }))

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>
      <div className="max-w-6xl mx-auto p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push(`/e/${eventSlug}/admin`)} className="text-sm text-slate-300 mb-1">← Back to Admin</button>
            <h1 className="text-2xl font-semibold">Scoring Rubric</h1>
            <p className="text-sm text-slate-400">Event: <span className="font-mono text-indigo-300">{eventSlug}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCompact(c => !c)} className="text-sm px-3 py-1 rounded glass-panel border-white/10 hover:bg-white/5">{compact ? 'Compact' : 'Spacious'}</button>
            <button onClick={() => setShowRawJson(s => !s)} className="text-sm px-3 py-1 rounded glass-panel border-white/10 hover:bg-white/5">{showRawJson ? 'Hide JSON' : 'Show JSON'}</button>
            <Button variant="secondary" onClick={loadRubric}>Reset</Button>
            <Button onClick={saveRubric} disabled={saving}>{saving ? 'Saving...' : 'Save Rubric'}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <aside className="md:col-span-1">
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Rounds</div>
                <div className="text-xs text-slate-400">{rounds.length}</div>
              </div>
              <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
                {rounds.map(r => (
                  <button key={r.number} onClick={() => setSelectedRound(r.number)} className={`w-full text-left px-3 py-2 rounded ${selectedRound === r.number ? 'bg-indigo-700 border-indigo-500' : 'bg-slate-900 border-slate-800'} text-sm border`}>
                    <div className="font-medium">{r.name || `Round ${r.number}`}</div>
                    <div className="text-xs text-slate-400">{r.roundDurationMinutes ? `${r.roundDurationMinutes} min` : 'Duration —'}</div>
                  </button>
                ))}
                <button onClick={() => setSelectedRound(0)} className={`w-full text-left px-3 py-2 rounded ${selectedRound === 0 ? 'bg-indigo-700 border-indigo-500' : 'bg-slate-900 border-slate-800'} text-sm border`}>All Rounds</button>
              </div>
              {/* Round assignments panel removed — not required anymore */}
            </div>
          </aside>

          <main className="md:col-span-2 space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Criteria {selectedRound && selectedRound > 0 ? `(Round ${selectedRound})` : ''}</div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => addCriterion()}>+ Add Criterion</Button>
                  {selectedRound > 0 && <Button variant="secondary" onClick={createCriterionForSelectedRound}>+ Create for Round</Button>}
                  <Button variant="ghost" onClick={() => setShowTemplates(s => !s)}>Templates</Button>
                </div>
              </div>

              {showTemplates && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t, i) => (<button key={i} onClick={() => addCriterion(t)} className="px-3 py-2 border border-white/10 rounded text-sm bg-white/5 hover:bg-white/10">+ {t.label}</button>))}
                </div>
              )}

              <div className={`${compact ? 'space-y-1' : 'space-y-3'}`}>
                {selectedRound && selectedRound > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-2">Assigned (criteria already applied to this round)</div>
                      <div className="space-y-2">
                        {criteria.map((criterion, origIdx) => ({ criterion, origIdx })).filter(({ criterion }) => appliesToRound(criterion, selectedRound)).map(({ criterion, origIdx }) => (
                          <div key={origIdx} className={`p-2 rounded border ${compact ? 'text-sm' : ''} border-white/10 bg-white/5 flex justify-between items-center`}>
                            <div className="flex-1">
                              <div className={`font-medium ${!criterion.label ? 'text-amber-300' : 'text-white'}`}>{criterion.label || criterion.key}</div>
                              <div className="text-xs text-slate-400">Max {criterion.max} • {criterion.weight}x <span className="font-mono text-xs ml-2">{criterion.key}</span></div>
                            </div>
                            <div className="flex gap-2">
                              <button title="Edit" onClick={() => setEditingIndex(origIdx)} className="p-1 text-slate-300">✎</button>
                              <button title="Unassign" onClick={() => toggleRoundForCriterion(origIdx, selectedRound)} className="p-1 text-slate-300">↩</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-2">Unassigned (criteria not applied to this round)</div>
                      <div className="space-y-2">
                        {criteria.map((criterion, origIdx) => ({ criterion, origIdx })).filter(({ criterion }) => !appliesToRound(criterion, selectedRound)).map(({ criterion, origIdx }) => (
                          <div key={origIdx} className={`p-2 rounded border ${compact ? 'text-sm' : ''} border-white/10 bg-white/5 flex justify-between items-center opacity-60 hover:opacity-100`}>
                            <div className="flex-1">
                              <div className={`font-medium ${!criterion.label ? 'text-amber-300' : 'text-white'}`}>{criterion.label || criterion.key}</div>
                              <div className="text-xs text-slate-400">Max {criterion.max} • {criterion.weight}x <span className="font-mono text-xs ml-2">{criterion.key}</span></div>
                            </div>
                            <div className="flex gap-2">
                              <button title="Assign to round" onClick={() => assignCriterionToRound(origIdx, selectedRound)} className="p-1 text-slate-300">＋</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  criteria.map((criterion, idx) => (
                    <div key={idx} className={`p-3 rounded border ${compact ? 'text-sm' : ''} border-white/10 bg-white/5 flex justify-between items-center`}>
                      <div className="flex-1 cursor-pointer" onClick={() => setEditingIndex(idx)}>
                        <div className={`font-medium ${!criterion.label ? 'text-amber-300' : 'text-white'}`}>{criterion.label || '(Untitled)'}</div>
                        <div className="text-xs text-slate-400">Max: {criterion.max} • Weight: {criterion.weight}x</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => moveCriterion(idx, 'up')} className="px-2 py-1 text-sm">↑</button>
                        <button onClick={() => moveCriterion(idx, 'down')} className="px-2 py-1 text-sm">↓</button>
                        <Button variant="destructive" onClick={() => removeCriterion(idx)}>Delete</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {editingIndex !== null && (
              <div className="glass-panel p-4">
                <h3 className="text-sm font-medium mb-2">Edit Criterion</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="text" value={criteria[editingIndex].label} onChange={e => updateCriterion(editingIndex, { label: e.target.value })} className="col-span-2 glass-input p-2 rounded" placeholder="Criterion label" />
                  <input type="number" min={1} value={criteria[editingIndex].max} onChange={e => updateCriterion(editingIndex, { max: Number(e.target.value) })} className="glass-input p-2 rounded" />
                </div>
                <div className="mt-3">
                  <div className="text-xs mb-2">Apply to rounds</div>
                  <div className="flex gap-2 flex-wrap">
                    {rounds.map(r => { const num = r.number; const isSelected = (criteria[editingIndex].rounds || []).includes(num); return (<button key={num} onClick={() => toggleRoundForCriterion(editingIndex, num)} className={`px-3 py-1 rounded text-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300 border border-slate-700'}`}>{r.name || `Round ${num}`}</button>) })}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => setEditingIndex(null)}>Done</Button>
                  <Button variant="secondary" onClick={() => removeCriterion(editingIndex)}>Delete</Button>
                </div>
              </div>
            )}

            {showRawJson && (
              <div className="bg-slate-800 rounded p-4 text-sm border border-slate-700">
                <pre className="whitespace-pre-wrap text-slate-200">{JSON.stringify(rawRubricJson, null, 2)}</pre>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
