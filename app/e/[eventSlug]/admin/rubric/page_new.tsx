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

type RoundConfig = {
  number: number
  name: string
  durationMinutes?: number
}

const TEMPLATES = [
  { key: 'innovation', label: 'Innovation', max: 100, weight: 1, description: 'Originality and creativity of the solution', required: true },
  { key: 'impact', label: 'Impact', max: 100, weight: 1, description: 'Real-world potential and value', required: true },
  { key: 'technical', label: 'Technical Excellence', max: 100, weight: 1, description: 'Quality and sophistication of implementation', required: true },
  { key: 'presentation', label: 'Presentation', max: 100, weight: 1, description: 'Communication clarity and delivery', required: true },
  { key: 'feasibility', label: 'Feasibility', max: 100, weight: 1, description: 'Realistic and achievable in scope', required: true },
  { key: 'design', label: 'Design Quality', max: 100, weight: 1, description: 'User experience and aesthetics', required: true },
]

export default function EventRubricPage() {
  const params = useParams()
  const router = useRouter()
  const eventSlug = params.eventSlug as string

  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [roundsConfig, setRoundsConfig] = useState<RoundConfig[]>([{ number: 1, name: 'Round 1' }])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    loadRubricAndRounds()
  }, [eventSlug])

  async function loadRubricAndRounds() {
    setLoading(true)
    try {
      const [rubricRes, roundsRes] = await Promise.all([
        fetch(`/api/scoring-schema?eventSlug=${eventSlug}`),
        fetch(`/api/rounds?eventSlug=${eventSlug}`)
      ])

      if (rubricRes.ok) {
        const data = await rubricRes.json()
        setCriteria(data.rubric || [])
      }

      if (roundsRes.ok) {
        const data = await roundsRes.json()
        if (data.rounds && data.rounds.length > 0) {
          setRoundsConfig(data.rounds.map((r: any, i: number) => ({
            number: i + 1,
            name: r.name || `Round ${i + 1}`,
            durationMinutes: r.durationMinutes
          })))
        }
      }
    } catch (err) {
      toast.error('Error loading data')
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
    setExpandedIndex(criteria.length)
    setShowTemplates(false)
  }

  function updateCriterion(index: number, updates: Partial<Criterion>) {
    setCriteria(criteria.map((c, i) => (i === index ? { ...c, ...updates } : c)))
  }

  function duplicateCriterion(index: number) {
    const original = criteria[index]
    const duplicate = {
      ...original,
      key: `${original.key}_copy_${Date.now()}`,
      label: `${original.label} (Copy)`
    }
    const newCriteria = [...criteria]
    newCriteria.splice(index + 1, 0, duplicate)
    setCriteria(newCriteria)
    toast.success('Criterion duplicated')
  }

  function removeCriterion(index: number) {
    if (!confirm('Remove this criterion? This cannot be undone.')) return
    setCriteria(criteria.filter((_, i) => i !== index))
    if (expandedIndex === index) setExpandedIndex(null)
    toast.success('Criterion removed')
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

  function addRound() {
    const newRound = {
      number: roundsConfig.length + 1,
      name: `Round ${roundsConfig.length + 1}`,
    }
    setRoundsConfig([...roundsConfig, newRound])
  }

  function updateRound(index: number, updates: Partial<RoundConfig>) {
    setRoundsConfig(roundsConfig.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  function removeRound(index: number) {
    if (roundsConfig.length === 1) {
      toast.error('Must have at least one round')
      return
    }
    if (!confirm('Remove this round?')) return
    const newRounds = roundsConfig.filter((_, i) => i !== index)
    // Renumber
    newRounds.forEach((r, i) => {
      r.number = i + 1
    })
    setRoundsConfig(newRounds)
    // Clear round assignments that reference removed rounds
    setCriteria(criteria.map(c => ({
      ...c,
      rounds: c.rounds?.filter(r => r <= newRounds.length) || null
    })))
  }

  async function saveAll() {
    // Validation
    const errors: string[] = []
    criteria.forEach((c, i) => {
      if (!c.label?.trim()) errors.push(`Criterion ${i + 1}: Label is required`)
      if (!c.key?.trim()) errors.push(`Criterion ${i + 1}: Key is required`)
      if (c.label && c.label.trim().length < 2) errors.push(`Criterion ${i + 1}: Label too short (min 2 chars)`)
      if (c.key && c.key.trim().length < 2) errors.push(`Criterion ${i + 1}: Key too short (min 2 chars)`)
      if (c.max <= 0) errors.push(`Criterion ${i + 1}: Max score must be positive`)
      if (c.weight < 0) errors.push(`Criterion ${i + 1}: Weight cannot be negative`)
    })

    // Duplicate keys
    const keys = criteria.map(c => c.key)
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i)
    if (dupes.length > 0) {
      errors.push(`Duplicate keys found: ${[...new Set(dupes)].join(', ')}`)
    }

    if (errors.length > 0) {
      toast.error(
        <div className="max-w-md">
          <div className="font-bold mb-2">⚠️ Validation Errors</div>
          {errors.slice(0, 4).map((e, i) => (
            <div key={i} className="text-sm mb-1">• {e}</div>
          ))}
          {errors.length > 4 && (
            <div className="text-sm text-slate-400 mt-2">
              ...and {errors.length - 4} more error{errors.length - 4 > 1 ? 's' : ''}
            </div>
          )}
        </div>,
        { duration: 6000 }
      )
      return
    }

    setSaving(true)
    try {
      // Save rubric
      const rubricRes = await fetch('/api/scoring-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubric: criteria, eventSlug }),
      })

      // Save rounds configuration
      const roundsRes = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'configure-multiple',
          eventSlug,
          rounds: roundsConfig 
        }),
      })

      if (rubricRes.ok && roundsRes.ok) {
        toast.success('✅ Rubric and rounds saved successfully!')
        setExpandedIndex(null)
      } else {
        const rubricError = !rubricRes.ok ? await rubricRes.json() : null
        const roundsError = !roundsRes.ok ? await roundsRes.json() : null
        toast.error(rubricError?.error || roundsError?.error || 'Failed to save')
      }
    } catch (err) {
      toast.error('Network error while saving')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading rubric configuration...</div>
      </div>
    )
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  const maxPossibleScore = criteria.reduce((sum, c) => sum + c.max * c.weight, 0)

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/e/${eventSlug}/admin`)}
            className="text-slate-400 hover:text-white mb-4 flex items-center gap-2 transition-colors"
          >
            <span className="text-xl">←</span> Back to Admin
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                📋 Scoring Rubric & Rounds
              </h1>
              <p className="text-slate-400">
                Event: <span className="font-mono text-blue-400">{eventSlug}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={loadRubricAndRounds}
                className="whitespace-nowrap"
              >
                🔄 Refresh
              </Button>
              <Button 
                onClick={saveAll} 
                disabled={saving || criteria.length === 0}
                className="whitespace-nowrap min-w-[120px]"
              >
                {saving ? '💾 Saving...' : '💾 Save All'}
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <div className="text-3xl font-bold text-blue-400">{criteria.length}</div>
            <div className="text-sm text-slate-400 mt-1">Criteria</div>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <div className="text-3xl font-bold text-purple-400">{roundsConfig.length}</div>
            <div className="text-sm text-slate-400 mt-1">Rounds</div>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <div className="text-3xl font-bold text-green-400">{totalWeight.toFixed(1)}</div>
            <div className="text-sm text-slate-400 mt-1">Total Weight</div>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <div className="text-3xl font-bold text-orange-400">{maxPossibleScore}</div>
            <div className="text-sm text-slate-400 mt-1">Max Score</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Rounds */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">🎯 Judging Rounds</h2>
                <Button onClick={addRound} size="sm">
                  + Add
                </Button>
              </div>

              <div className="space-y-3">
                {roundsConfig.map((round, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                          {round.number}
                        </div>
                        <input
                          type="text"
                          value={round.name}
                          onChange={e => updateRound(index, { name: e.target.value })}
                          className="bg-transparent border-none text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                          placeholder="Round name"
                        />
                      </div>
                      {roundsConfig.length > 1 && (
                        <button
                          onClick={() => removeRound(index)}
                          className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                          title="Remove round"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Duration (optional)</label>
                      <input
                        type="number"
                        min="1"
                        value={round.durationMinutes || ''}
                        onChange={e => updateRound(index, { durationMinutes: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Minutes"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {roundsConfig.length > 1 && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Tip:</strong> Assign criteria to specific rounds in the rubric editor
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Criteria */}
          <div className="lg:col-span-2">
            {criteria.length === 0 ? (
              <Card className="text-center py-16">
                <div className="text-7xl mb-6">📝</div>
                <h3 className="text-2xl font-bold text-white mb-3">No Criteria Yet</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  Create scoring criteria that judges will use to evaluate participants
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button onClick={() => addCriterion()} size="lg">
                    ✨ Create Custom Criterion
                  </Button>
                  <Button variant="secondary" onClick={() => setShowTemplates(!showTemplates)} size="lg">
                    📚 Use Templates
                  </Button>
                </div>

                {showTemplates && (
                  <div className="mt-8 pt-8 border-t border-slate-700">
                    <p className="text-slate-400 mb-4">Quick Start Templates:</p>
                    <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                      {TEMPLATES.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => addCriterion(t)}
                          className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105"
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-white">Scoring Criteria</h2>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowTemplates(!showTemplates)} size="sm">
                      📚 Templates
                    </Button>
                    <Button onClick={() => addCriterion()} size="sm">
                      + Add Criterion
                    </Button>
                  </div>
                </div>

                {showTemplates && (
                  <Card className="bg-slate-800/30 mb-4">
                    <p className="text-sm text-slate-400 mb-3">Quick Add from Template:</p>
                    <div className="flex flex-wrap gap-2">
                      {TEMPLATES.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => addCriterion(t)}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {criteria.map((criterion, index) => {
                  const isExpanded = expandedIndex === index
                  const roundsApplied = criterion.rounds && criterion.rounds.length > 0
                    ? criterion.rounds.map(r => `R${r}`).join(', ')
                    : 'All rounds'

                  return (
                    <Card
                      key={index}
                      className={`${isExpanded ? 'ring-2 ring-blue-500' : ''} transition-all hover:shadow-lg`}
                    >
                      {/* Collapsed View */}
                      <div
                        className="flex items-start gap-4 cursor-pointer"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        {/* Number Badge */}
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                            {index + 1}
                          </div>
                          {!isExpanded && (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  moveCriterion(index, 'up')
                                }}
                                disabled={index === 0}
                                className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  moveCriterion(index, 'down')
                                }}
                                disabled={index === criteria.length - 1}
                                className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move down"
                              >
                                ▼
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-white mb-1 truncate">
                                {criterion.label || <span className="text-slate-500 italic">Untitled Criterion</span>}
                              </h3>
                              {criterion.description && (
                                <p className="text-sm text-slate-400 line-clamp-2">{criterion.description}</p>
                              )}
                            </div>
                            {!isExpanded && (
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    duplicateCriterion(index)
                                  }}
                                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                                  title="Duplicate"
                                >
                                  📋
                                </button>
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    removeCriterion(index)
                                  }}
                                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded transition-colors"
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Max:</span>
                              <span className="font-semibold text-blue-400">{criterion.max}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Weight:</span>
                              <span className="font-semibold text-purple-400">{criterion.weight}×</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Rounds:</span>
                              <span className="font-semibold text-green-400">{roundsApplied}</span>
                            </div>
                            {criterion.required && (
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Edit View */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-slate-700 space-y-6">
                          {/* Criterion Name */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-200 mb-2">
                              Criterion Name *
                            </label>
                            <input
                              type="text"
                              value={criterion.label}
                              onChange={e => updateCriterion(index, { label: e.target.value })}
                              placeholder="e.g., Innovation, Impact, Technical Excellence"
                              className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          {/* Key, Max, Weight */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Unique Key *
                              </label>
                              <input
                                type="text"
                                value={criterion.key}
                                onChange={e => updateCriterion(index, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                placeholder="innovation"
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Max Score *
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={criterion.max}
                                onChange={e => updateCriterion(index, { max: Math.max(1, Number(e.target.value)) })}
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Weight
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={criterion.weight}
                                onChange={e => updateCriterion(index, { weight: Math.max(0, Number(e.target.value)) })}
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-200 mb-2">
                              Description (shown to judges)
                            </label>
                            <textarea
                              value={criterion.description || ''}
                              onChange={e => updateCriterion(index, { description: e.target.value })}
                              placeholder="Provide guidance on what judges should look for..."
                              rows={3}
                              className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          {/* Round Assignment */}
                          {roundsConfig.length > 1 && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-3">
                                Apply to Rounds (leave empty for all rounds)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {roundsConfig.map((round) => {
                                  const isSelected = criterion.rounds?.includes(round.number) || false
                                  return (
                                    <button
                                      key={round.number}
                                      onClick={() => toggleRoundForCriterion(index, round.number)}
                                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                        isSelected
                                          ? 'bg-blue-500 text-white shadow-lg scale-105'
                                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                      }`}
                                    >
                                      Round {round.number}: {round.name}
                                    </button>
                                  )
                                })}
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                {!criterion.rounds || criterion.rounds.length === 0
                                  ? '✓ This criterion applies to all rounds'
                                  : `✓ This criterion applies to ${criterion.rounds.length} selected round(s)`}
                              </p>
                            </div>
                          )}

                          {/* Required Toggle */}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`required-${index}`}
                              checked={criterion.required !== false}
                              onChange={e => updateCriterion(index, { required: e.target.checked })}
                              className="w-5 h-5 rounded"
                            />
                            <label htmlFor={`required-${index}`} className="text-slate-300 font-medium">
                              Judges must score this criterion (required)
                            </label>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                            <div className="flex gap-2">
                              <button
                                onClick={() => duplicateCriterion(index)}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                              >
                                📋 Duplicate
                              </button>
                              <button
                                onClick={() => removeCriterion(index)}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                            <button
                              onClick={() => setExpandedIndex(null)}
                              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                            >
                              ✓ Done
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Save Button */}
        {criteria.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={saveAll}
              disabled={saving}
              size="lg"
              className="shadow-2xl min-w-[180px] h-14 text-lg"
            >
              {saving ? '💾 Saving...' : '💾 Save All Changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
