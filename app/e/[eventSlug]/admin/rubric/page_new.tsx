'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { EventNavigation } from '@/components/event-navigation'
import { 
  Plus, Save, Trash2, Copy, ChevronUp, ChevronDown, 
  GripVertical, Clock, Star, Target, Layers
} from 'lucide-react'

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
  const [editingCriterionIdx, setEditingCriterionIdx] = useState<number | null>(null)
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
    setEditingCriterionIdx(criteria.length)
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
    if (editingCriterionIdx === index) setEditingCriterionIdx(null)
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
            <div className="text-sm text-charcoal/60 dark:text-white/60 mt-2">
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
      <div className="min-h-screen bg-cream dark:bg-charcoal flex items-center justify-center">
        <div className="text-charcoal dark:text-white text-xl animate-pulse">Loading rubric...</div>
      </div>
    )
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  const maxPossibleScore = criteria.reduce((sum, c) => sum + c.max * c.weight, 0)

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal pt-20">
      <EventNavigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-charcoal dark:text-white">Scoring Rubric</h1>
            <p className="text-charcoal/60 dark:text-white/60 mt-1">Define criteria for judges to evaluate participants</p>
          </div>
          <Button
            onClick={saveAll}
            disabled={saving || criteria.length === 0}
            className="bg-charcoal dark:bg-white text-cream dark:text-charcoal hover:bg-charcoal/90 dark:hover:bg-white/90"
          >
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-charcoal/10 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-charcoal/10 dark:bg-white/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-charcoal/60 dark:text-white/60" />
              </div>
              <div>
                <div className="text-2xl font-bold text-charcoal dark:text-white">{criteria.length}</div>
                <div className="text-xs text-charcoal/50 dark:text-white/50">Criteria</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-charcoal/10 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-charcoal/10 dark:bg-white/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-charcoal/60 dark:text-white/60" />
              </div>
              <div>
                <div className="text-2xl font-bold text-charcoal dark:text-white">{roundsConfig.length}</div>
                <div className="text-xs text-charcoal/50 dark:text-white/50">Rounds</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-charcoal/10 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-charcoal dark:text-white">{totalWeight.toFixed(1)}</div>
                <div className="text-xs text-charcoal/50 dark:text-white/50">Total Weight</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-charcoal/10 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-charcoal dark:text-white">{maxPossibleScore}</div>
                <div className="text-xs text-charcoal/50 dark:text-white/50">Max Score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Rounds */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-charcoal dark:text-white">Rounds</h2>
                <button
                  onClick={addRound}
                  className="w-8 h-8 rounded-lg bg-charcoal/10 dark:bg-white/10 flex items-center justify-center text-charcoal dark:text-white hover:bg-charcoal/20 dark:hover:bg-white/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {roundsConfig.map((round, index) => (
                  <div
                    key={index}
                    className="p-3 bg-charcoal/5 dark:bg-white/5 rounded-xl border border-charcoal/10 dark:border-white/10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-charcoal dark:bg-white text-cream dark:text-charcoal flex items-center justify-center text-sm font-bold">
                        {round.number}
                      </span>
                      <input
                        type="text"
                        value={round.name}
                        onChange={e => updateRound(index, { name: e.target.value })}
                        className="flex-1 bg-transparent border-none text-charcoal dark:text-white font-medium focus:outline-none"
                        placeholder="Round name"
                      />
                      {roundsConfig.length > 1 && (
                        <button
                          onClick={() => removeRound(index)}
                          className="p-1 text-red-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-10">
                      <Clock className="w-3 h-3 text-charcoal/40 dark:text-white/40" />
                      <input
                        type="number"
                        min="1"
                        value={round.durationMinutes || ''}
                        onChange={e => updateRound(index, { durationMinutes: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Duration (min)"
                        className="w-24 px-2 py-1 bg-white dark:bg-gray-800 border border-charcoal/10 dark:border-white/10 rounded-lg text-sm text-charcoal dark:text-white focus:outline-none focus:ring-1 focus:ring-charcoal/20 dark:focus:ring-white/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-6 mt-6">
              <h2 className="text-lg font-semibold text-charcoal dark:text-white mb-4">Quick Add</h2>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => addCriterion(t)}
                    className="px-3 py-1.5 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 text-charcoal dark:text-white text-xs rounded-lg transition-colors"
                  >
                    + {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Criteria */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-charcoal dark:text-white">Scoring Criteria</h2>
              <Button onClick={() => addCriterion()} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Criterion
              </Button>
            </div>

            {criteria.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-charcoal/10 dark:border-white/10 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-charcoal/10 dark:bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-8 h-8 text-charcoal/40 dark:text-white/40" />
                </div>
                <h3 className="text-xl font-bold text-charcoal dark:text-white mb-2">No Criteria Yet</h3>
                <p className="text-charcoal/60 dark:text-white/60 max-w-md mx-auto mb-6">
                  Create scoring criteria that judges will use to evaluate participants
                </p>
                <Button onClick={() => addCriterion()}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Criterion
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {criteria.map((criterion, index) => {
                  const isEditing = editingCriterionIdx === index
                  const roundsLabel = criterion.rounds && criterion.rounds.length > 0
                    ? criterion.rounds.map(r => `R${r}`).join(', ')
                    : 'All'

                  return (
                    <div
                      key={index}
                      className={`bg-white dark:bg-gray-900 rounded-xl border ${isEditing ? 'border-charcoal dark:border-white ring-2 ring-charcoal/20 dark:ring-white/20' : 'border-charcoal/10 dark:border-white/10'} transition-all`}
                    >
                      {/* Collapsed View */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Number & Reorder */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="w-8 h-8 rounded-lg bg-charcoal dark:bg-white text-cream dark:text-charcoal flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            {!isEditing && (
                              <div className="flex flex-col">
                                <button
                                  onClick={() => moveCriterion(index, 'up')}
                                  disabled={index === 0}
                                  className="p-0.5 text-charcoal/30 dark:text-white/30 hover:text-charcoal dark:hover:text-white disabled:opacity-30 transition-colors"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveCriterion(index, 'down')}
                                  disabled={index === criteria.length - 1}
                                  className="p-0.5 text-charcoal/30 dark:text-white/30 hover:text-charcoal dark:hover:text-white disabled:opacity-30 transition-colors"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              /* Edit Mode */
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-medium text-charcoal/50 dark:text-white/50 mb-1">Name</label>
                                  <input
                                    type="text"
                                    value={criterion.label}
                                    onChange={e => updateCriterion(index, { label: e.target.value })}
                                    className="w-full px-3 py-2 bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/10 rounded-lg text-charcoal dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                                    placeholder="e.g., Innovation"
                                    autoFocus
                                  />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-charcoal/50 dark:text-white/50 mb-1">Key</label>
                                    <input
                                      type="text"
                                      value={criterion.key}
                                      onChange={e => updateCriterion(index, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                      className="w-full px-3 py-2 bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/10 rounded-lg text-charcoal dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-charcoal/50 dark:text-white/50 mb-1">Max Score</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={criterion.max}
                                      onChange={e => updateCriterion(index, { max: Math.max(1, Number(e.target.value)) })}
                                      className="w-full px-3 py-2 bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/10 rounded-lg text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-charcoal/50 dark:text-white/50 mb-1">Weight</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={criterion.weight}
                                      onChange={e => updateCriterion(index, { weight: Math.max(0, Number(e.target.value)) })}
                                      className="w-full px-3 py-2 bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/10 rounded-lg text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-charcoal/50 dark:text-white/50 mb-1">Description</label>
                                  <textarea
                                    value={criterion.description || ''}
                                    onChange={e => updateCriterion(index, { description: e.target.value })}
                                    placeholder="Guidance for judges..."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/10 rounded-lg text-charcoal dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                                  />
                                </div>

                                {roundsConfig.length > 1 && (
                                  <div>
                                    <label className="block text-xs font-medium text-charcoal/50 dark:text-white/50 mb-2">Apply to Rounds</label>
                                    <div className="flex flex-wrap gap-2">
                                      {roundsConfig.map((round) => {
                                        const isSelected = criterion.rounds?.includes(round.number) || false
                                        return (
                                          <button
                                            key={round.number}
                                            onClick={() => toggleRoundForCriterion(index, round.number)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                              isSelected
                                                ? 'bg-charcoal dark:bg-white text-cream dark:text-charcoal'
                                                : 'bg-charcoal/10 dark:bg-white/10 text-charcoal/60 dark:text-white/60'
                                            }`}
                                          >
                                            R{round.number}
                                          </button>
                                        )
                                      })}
                                    </div>
                                    <p className="text-xs text-charcoal/40 dark:text-white/40 mt-1">
                                      {!criterion.rounds || criterion.rounds.length === 0 ? 'Applies to all rounds' : ''}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2">
                                  <label className="flex items-center gap-2 text-sm text-charcoal/70 dark:text-white/70">
                                    <input
                                      type="checkbox"
                                      checked={criterion.required !== false}
                                      onChange={e => updateCriterion(index, { required: e.target.checked })}
                                      className="w-4 h-4 rounded"
                                    />
                                    Required
                                  </label>
                                  <button
                                    onClick={() => setEditingCriterionIdx(null)}
                                    className="px-4 py-2 bg-charcoal dark:bg-white text-cream dark:text-charcoal rounded-lg text-sm font-medium hover:bg-charcoal/90 dark:hover:bg-white/90 transition-colors"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Display Mode */
                              <div 
                                className="cursor-pointer"
                                onClick={() => setEditingCriterionIdx(index)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-charcoal dark:text-white truncate">
                                      {criterion.label || <span className="text-charcoal/40 dark:text-white/40 italic">Untitled</span>}
                                    </h3>
                                    {criterion.description && (
                                      <p className="text-sm text-charcoal/60 dark:text-white/60 line-clamp-1 mt-0.5">{criterion.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); duplicateCriterion(index) }}
                                      className="p-1.5 text-charcoal/40 dark:text-white/40 hover:text-charcoal dark:hover:text-white transition-colors"
                                      title="Duplicate"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removeCriterion(index) }}
                                      className="p-1.5 text-red-400 hover:text-red-500 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                                  <span className="px-2 py-0.5 bg-charcoal/10 dark:bg-white/10 rounded text-charcoal/70 dark:text-white/70">
                                    Max: {criterion.max}
                                  </span>
                                  <span className="px-2 py-0.5 bg-charcoal/10 dark:bg-white/10 rounded text-charcoal/70 dark:text-white/70">
                                    Weight: {criterion.weight}×
                                  </span>
                                  <span className="px-2 py-0.5 bg-emerald-500/20 rounded text-emerald-700 dark:text-emerald-400">
                                    Rounds: {roundsLabel}
                                  </span>
                                  {criterion.required && (
                                    <span className="px-2 py-0.5 bg-orange-500/20 rounded text-orange-700 dark:text-orange-400">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
