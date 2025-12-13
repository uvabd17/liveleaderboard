'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Card from '@/components/ui/card'
import toast from 'react-hot-toast'

type Criterion = {
  key: string
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
  const [rounds, setRounds] = useState<number[]>([1])
  const [selectedRound, setSelectedRound] = useState<number | 0>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    loadRubric()
    // load available rounds from backend if present
    ;(async () => {
      try {
        const res = await fetch(`/api/rounds?eventSlug=${eventSlug}`)
        if (res.ok) {
          const data = await res.json()
          const count = (data.rounds || []).length
          if (count > 0) setRounds(Array.from({ length: count }, (_, i) => i + 1))
        }
      } catch (err) {
        // ignore — keep local rounds input
      }
    })()
  }, [eventSlug])

  async function loadRubric() {
    setLoading(true)
    try {
      const res = await fetch(`/api/scoring-schema?eventSlug=${eventSlug}`)
      if (res.ok) {
        const data = await res.json()
        setCriteria(data.rubric || [])
      } else {
        toast.error('Failed to load rubric')
      }
    } catch (err) {
      toast.error('Error loading rubric')
    } finally {
      setLoading(false)
    }
  }

  function addCriterion(template?: Criterion) {
    const newCrit: Criterion = template || {
      key: `criterion_${Date.now()}`,
      label: '',
      max: 100,
      weight: 1,
      required: true,
    }
    setCriteria([...criteria, newCrit])
    setEditingIndex(criteria.length)
    setShowTemplates(false)
  }

  function updateCriterion(index: number, updates: Partial<Criterion>) {
    setCriteria(criteria.map((c, i) => (i === index ? { ...c, ...updates } : c)))
  }

  function removeCriterion(index: number) {
    if (!confirm('Remove this criterion?')) return
    setCriteria(criteria.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  function moveCriterion(index: number, direction: 'up' | 'down') {
    const newCriteria = [...criteria]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= criteria.length) return
    ;[newCriteria[index], newCriteria[targetIndex]] = [newCriteria[targetIndex], newCriteria[index]]
    setCriteria(newCriteria)
  }

  function toggleRoundForCriterion(index: number, round: number) {
    const criterion = criteria[index]
    const currentRounds = criterion.rounds || []
    const newRounds = currentRounds.includes(round)
      ? currentRounds.filter(r => r !== round)
      : [...currentRounds, round].sort((a, b) => a - b)
    updateCriterion(index, { rounds: newRounds.length > 0 ? newRounds : null })
  }

  async function saveRubric() {
    // Validation
    const errors: string[] = []
    criteria.forEach((c, i) => {
      if (!c.label || c.label.trim().length < 2) {
        errors.push(`Criterion ${i + 1}: Label required (min 2 chars)`)
      }
      if (!c.key || c.key.trim().length < 2) {
        errors.push(`Criterion ${i + 1}: Key required (min 2 chars)`)
      }
      if (c.max <= 0) errors.push(`Criterion ${i + 1}: Max score must be positive`)
      if (c.weight < 0) errors.push(`Criterion ${i + 1}: Weight cannot be negative`)
    })

    // Duplicate keys
    const keys = criteria.map(c => c.key)
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i)
    if (dupes.length > 0) {
      errors.push(`Duplicate keys: ${[...new Set(dupes)].join(', ')}`)
    }

    if (errors.length > 0) {
      toast.error(
        <div>
          <div className="font-semibold mb-1">Validation Errors:</div>
          {errors.slice(0, 3).map((e, i) => (
            <div key={i} className="text-sm">
              • {e}
            </div>
          ))}
          {errors.length > 3 && <div className="text-sm">...and {errors.length - 3} more</div>}
        </div>,
        { duration: 5000 }
      )
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/scoring-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubric: criteria, eventSlug }),
      })

      if (res.ok) {
        toast.success('✅ Rubric saved!')
        setEditingIndex(null)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save')
      }
    } catch (err) {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading rubric...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/e/${eventSlug}/admin`)}
            className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back to Admin
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Scoring Rubric</h1>
          <p className="text-slate-400">
            Event: <span className="font-mono text-blue-400">{eventSlug}</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Define criteria that judges will use to evaluate participants
          </p>
        </div>

        {/* Rounds Configuration */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🎯 Judging Rounds</h3>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="number"
              min={1}
              max={10}
              value={rounds.length}
              onChange={e => {
                const count = Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                setRounds(Array.from({ length: count }, (_, i) => i + 1))
              }}
              className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            />
            <span className="text-slate-400">
              {rounds.length === 1 ? '1 round (all criteria apply)' : `${rounds.length} rounds`}
            </span>
          </div>
          <div className="mb-3">
            <label className="block text-sm text-slate-300 mb-2">Edit Context</label>
            <select
              value={selectedRound ?? 0}
              onChange={e => setSelectedRound(Number(e.target.value) || 0)}
              className="w-44 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value={0}>All Rounds</option>
              {rounds.map(r => (
                <option key={r} value={r}>Round {r}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">Choose a round to focus rubric edits; criteria still save with per-round assignments.</p>
          </div>
          {rounds.length > 1 && (
            <div className="text-sm text-slate-500">
              💡 Tip: You can assign different criteria to different rounds below
            </div>
          )}
        </Card>

        {/* Criteria List */}
        <div className="space-y-4 mb-6">
          {criteria.length === 0 ? (
            <Card className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Criteria Yet</h3>
              <p className="text-slate-400 mb-6">Start by adding your first scoring criterion</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={() => addCriterion()}>✨ Create Custom</Button>
                <Button variant="secondary" onClick={() => setShowTemplates(!showTemplates)}>
                  📚 Use Template
                </Button>
              </div>

              {showTemplates && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-4">Quick Start Templates:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {TEMPLATES.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => addCriterion(t)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        + {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <>
              {criteria.map((criterion, index) => (
                <Card
                  key={index}
                  className={`${editingIndex === index ? 'border-2 border-blue-500' : ''} transition-all`}
                >
                  <div className="flex items-start gap-4">
                    {/* Number & Controls */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="text-2xl font-bold text-slate-600">#{index + 1}</div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveCriterion(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-lg"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveCriterion(index, 'down')}
                          disabled={index === criteria.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-lg"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {editingIndex === index ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-200 mb-2">
                              Criterion Name *
                            </label>
                            <input
                              type="text"
                              value={criterion.label}
                              onChange={e => updateCriterion(index, { label: e.target.value })}
                              placeholder="e.g., Innovation, Impact, Technical Excellence"
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Unique Key *
                              </label>
                              <input
                                type="text"
                                value={criterion.key}
                                onChange={e =>
                                  updateCriterion(index, {
                                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                                  })
                                }
                                placeholder="innovation"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <p className="text-xs text-slate-500 mt-1">Auto-formatted ID</p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Maximum Points *
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={criterion.max}
                                onChange={e => updateCriterion(index, { max: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <p className="text-xs text-slate-500 mt-1">e.g., 100</p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-200 mb-2">
                              Weight Multiplier
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={criterion.weight}
                              onChange={e => updateCriterion(index, { weight: Number(e.target.value) })}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-slate-500 mt-1">Usually 1.0</p>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-200 mb-2">
                              Description for Judges (optional)
                            </label>
                            <textarea
                              value={criterion.description || ''}
                              onChange={e => updateCriterion(index, { description: e.target.value })}
                              placeholder="Help judges understand what to evaluate... (e.g., 'Evaluate the originality and creativity of the solution')"
                              rows={4}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                          </div>

                          {/* Rounds Selection */}
                          {rounds.length > 1 && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Apply to Specific Rounds (optional)
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {rounds.map(round => {
                                  const isSelected = (criterion.rounds || []).includes(round)
                                  return (
                                    <button
                                      key={round}
                                      onClick={() => toggleRoundForCriterion(index, round)}
                                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                      }`}
                                    >
                                      Round {round}
                                    </button>
                                  )
                                })}
                              </div>
                              {(!criterion.rounds || criterion.rounds.length === 0) && (
                                <p className="text-xs text-slate-500 mt-2">
                                  ✓ Applies to all rounds by default
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={criterion.required !== false}
                                onChange={e => updateCriterion(index, { required: e.target.checked })}
                                className="w-4 h-4 rounded"
                              />
                              Required field
                            </label>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-slate-700">
                            <Button onClick={() => setEditingIndex(null)}>✓ Done</Button>
                            <Button variant="secondary" onClick={() => removeCriterion(index)}>
                              🗑️ Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div
                          onClick={() => setEditingIndex(index)}
                          className="cursor-pointer hover:bg-slate-800/30 p-3 rounded transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white">
                                {criterion.label || '(Untitled)'}
                              </h3>
                              <p className="text-xs text-slate-500 font-mono">{criterion.key}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Max</div>
                              <div className="text-2xl font-bold text-blue-400">{criterion.max}</div>
                            </div>
                          </div>
                          {criterion.description && (
                            <p className="text-sm text-slate-300 mb-2">{criterion.description}</p>
                          )}
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>⚖️ Weight: {criterion.weight}x</span>
                            <span>{criterion.required !== false ? '✓ Required' : '○ Optional'}</span>
                            {criterion.rounds && criterion.rounds.length > 0 && (
                              <span>🔄 Rounds: {criterion.rounds.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              <button
                onClick={() => addCriterion()}
                className="w-full py-4 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg text-slate-400 hover:text-white transition-colors text-lg"
              >
                + Add Another Criterion
              </button>
            </>
          )}
        </div>

        {/* Save Actions */}
        {criteria.length > 0 && (
          <Card className="bg-slate-800/50 sticky bottom-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-white font-medium">
                  {criteria.length} {criteria.length === 1 ? 'criterion' : 'criteria'}
                </p>
                <p className="text-xs text-slate-400">
                  Total possible: {criteria.reduce((sum, c) => sum + c.max * c.weight, 0)} points
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={loadRubric}>
                  Reset
                </Button>
                <Button onClick={saveRubric} disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save Rubric'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
