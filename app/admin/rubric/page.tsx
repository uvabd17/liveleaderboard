"use client"
import React from 'react'
import { ProtectedPage } from '../../../lib/protected-page'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

type Criterion = { 
  key: string
  label: string
  max: number
  weight: number
  description?: string
  rounds?: number[] | null
  required?: boolean
  scale?: 'number'|'radio'|'range'
}

const CRITERION_TEMPLATES = [
  { label: 'Innovation', key: 'innovation', max: 100, weight: 1, description: 'Originality and creativity of the solution' },
  { label: 'Impact', key: 'impact', max: 100, weight: 1, description: 'Potential real-world impact' },
  { label: 'Technical Excellence', key: 'technical', max: 100, weight: 1, description: 'Quality of implementation' },
  { label: 'Presentation', key: 'presentation', max: 100, weight: 1, description: 'Quality of the pitch' },
  { label: 'Feasibility', key: 'feasibility', max: 100, weight: 1, description: 'Can it actually be built?' },
]

function RubricDesignerContent() {
  const [criteria, setCriteria] = React.useState<Criterion[]>([])
  const [eventSlug, setEventSlug] = React.useState<string>('demo-event')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [showTemplates, setShowTemplates] = React.useState(false)

  React.useEffect(() => {
    loadRubric()
  }, [eventSlug])

  async function loadRubric() {
    if (!eventSlug) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/scoring-schema?eventSlug=${encodeURIComponent(eventSlug)}`)
      const data = await res.json()
      setCriteria(data.rubric || [])
    } catch (err) {
      toast.error('Failed to load rubric')
    } finally {
      setIsLoading(false)
    }
  }

  function addCriterion(template?: Criterion) {
    const newCriterion = template || {
      key: `criterion_${Date.now()}`,
      label: '',
      max: 100,
      weight: 1,
      required: true,
      scale: 'number' as const
    }
    setCriteria([...criteria, newCriterion])
    setEditingIndex(criteria.length)
    setShowTemplates(false)
  }

  function updateCriterion(index: number, updates: Partial<Criterion>) {
    setCriteria(criteria.map((c, i) => i === index ? { ...c, ...updates } : c))
  }

  function removeCriterion(index: number) {
    if (confirm('Remove this criterion?')) {
      setCriteria(criteria.filter((_, i) => i !== index))
      if (editingIndex === index) setEditingIndex(null)
    }
  }

  function moveCriterion(index: number, direction: 'up' | 'down') {
    const newCriteria = [...criteria]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= criteria.length) return
    [newCriteria[index], newCriteria[targetIndex]] = [newCriteria[targetIndex], newCriteria[index]]
    setCriteria(newCriteria)
  }

  async function saveRubric() {
    // Validation
    const errors: string[] = []
    criteria.forEach((c, i) => {
      if (!c.label || c.label.trim().length < 2) {
        errors.push(`Criterion ${i + 1}: Label must be at least 2 characters`)
      }
      if (!c.key || c.key.trim().length < 2) {
        errors.push(`Criterion ${i + 1}: Key must be at least 2 characters`)
      }
      if (c.max <= 0) {
        errors.push(`Criterion ${i + 1}: Max score must be positive`)
      }
      if (c.weight < 0) {
        errors.push(`Criterion ${i + 1}: Weight cannot be negative`)
      }
    })

    // Check for duplicate keys
    const keys = criteria.map(c => c.key)
    const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i)
    if (duplicates.length > 0) {
      errors.push(`Duplicate keys found: ${[...new Set(duplicates)].join(', ')}`)
    }

    if (errors.length > 0) {
      toast.error(
        <div>
          <div className="font-semibold mb-2">Validation Errors:</div>
          {errors.map((err, i) => <div key={i} className="text-sm">• {err}</div>)}
        </div>,
        { duration: 6000 }
      )
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/scoring-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubric: criteria, eventSlug })
      })

      if (res.ok) {
        toast.success('✅ Rubric saved successfully!')
        setEditingIndex(null)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save rubric')
      }
    } catch (err) {
      toast.error('Failed to save rubric')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Scoring Rubric Designer</h1>
          <p className="text-slate-400">Define the criteria judges will use to evaluate participants</p>
        </div>

        {/* Event Selector */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">Event Slug</label>
              <input
                type="text"
                value={eventSlug}
                onChange={e => setEventSlug(e.target.value)}
                placeholder="demo-event"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Enter the event slug to load and edit its rubric</p>
            </div>
            <Button onClick={loadRubric} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Load'}
            </Button>
          </div>
        </Card>

        {/* Criteria List */}
        <div className="space-y-4 mb-6">
          {criteria.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Criteria Yet</h3>
              <p className="text-slate-400 mb-6">Start by adding your first scoring criterion</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => addCriterion()}>
                  ✨ Create Custom Criterion
                </Button>
                <Button variant="secondary" onClick={() => setShowTemplates(!showTemplates)}>
                  📚 Use Template
                </Button>
              </div>

              {showTemplates && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-3">Quick Start Templates:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {CRITERION_TEMPLATES.map((template, i) => (
                      <button
                        key={i}
                        onClick={() => addCriterion(template)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        + {template.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <>
              {criteria.map((criterion, index) => (
                <Card key={index} className={editingIndex === index ? 'border-2 border-blue-500' : ''}>
                  <div className="flex items-start gap-4">
                    {/* Drag Handle / Number */}
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <div className="text-2xl font-bold text-slate-600">#{index + 1}</div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveCriterion(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveCriterion(index, 'down')}
                          disabled={index === criteria.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
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
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Label *</label>
                              <input
                                type="text"
                                value={criterion.label}
                                onChange={e => updateCriterion(index, { label: e.target.value })}
                                placeholder="e.g., Innovation"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Key (unique) *</label>
                              <input
                                type="text"
                                value={criterion.key}
                                onChange={e => updateCriterion(index, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                placeholder="e.g., innovation"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Max Score *</label>
                              <input
                                type="number"
                                min="1"
                                value={criterion.max}
                                onChange={e => updateCriterion(index, { max: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Weight</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={criterion.weight}
                                onChange={e => updateCriterion(index, { weight: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Input Type</label>
                              <select
                                value={criterion.scale || 'number'}
                                onChange={e => updateCriterion(index, { scale: e.target.value as any })}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="number">Number Input</option>
                                <option value="range">Slider</option>
                                <option value="radio">Radio Buttons</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Description (optional)</label>
                            <textarea
                              value={criterion.description || ''}
                              onChange={e => updateCriterion(index, { description: e.target.value })}
                              placeholder="Help judges understand what to look for..."
                              rows={2}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-slate-300">
                              <input
                                type="checkbox"
                                checked={criterion.required !== false}
                                onChange={e => updateCriterion(index, { required: e.target.checked })}
                                className="w-4 h-4 rounded"
                              />
                              Required field
                            </label>
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={() => setEditingIndex(null)}>Done</Button>
                            <Button variant="secondary" onClick={() => removeCriterion(index)}>
                              🗑️ Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div onClick={() => setEditingIndex(index)} className="cursor-pointer hover:bg-slate-800/50 p-2 rounded transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{criterion.label || '(Untitled)'}</h3>
                              <p className="text-sm text-slate-400">Key: {criterion.key}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-slate-400">Max Score</div>
                              <div className="text-xl font-bold text-blue-400">{criterion.max}</div>
                            </div>
                          </div>
                          {criterion.description && (
                            <p className="text-sm text-slate-300 mb-2">{criterion.description}</p>
                          )}
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>Weight: {criterion.weight}</span>
                            <span>Type: {criterion.scale || 'number'}</span>
                            <span>{criterion.required !== false ? 'Required' : 'Optional'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              <button
                onClick={() => addCriterion()}
                className="w-full py-4 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                + Add Another Criterion
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        {criteria.length > 0 && (
          <Card className="bg-slate-800/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-400">
                  {criteria.length} {criteria.length === 1 ? 'criterion' : 'criteria'} • 
                  Total possible score: {criteria.reduce((sum, c) => sum + c.max * c.weight, 0)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={loadRubric} disabled={isLoading}>
                  Reset Changes
                </Button>
                <Button onClick={saveRubric} disabled={isSaving || criteria.length === 0}>
                  {isSaving ? 'Saving...' : '💾 Save Rubric'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function RubricDesignerPage() {
  return (
    <ProtectedPage requiredRole="admin">
      <RubricDesignerContent />
    </ProtectedPage>
  )
}
