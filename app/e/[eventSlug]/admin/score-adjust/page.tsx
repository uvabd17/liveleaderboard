'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Participant {
  id: string
  name: string
  kind: string
  totalScore: number
  rank: number
  scores: Array<{
    id: string
    criterion: string
    value: number
    comment?: string
  }>
}

export default function ScoreAdjustPage() {
  const params = useParams()
  const router = useRouter()
  const eventSlug = params.eventSlug as string

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingScores, setEditingScores] = useState<Record<string, Record<string, number>>>({})
  const [allRoundsCompleted, setAllRoundsCompleted] = useState(false)
  const [roundsConfig, setRoundsConfig] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [eventSlug])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [leaderboardRes, roundsRes, completionsRes] = await Promise.all([
        fetch(`/api/events/${eventSlug}/leaderboard`),
        fetch(`/api/rounds?eventSlug=${eventSlug}`),
        fetch(`/api/events/${eventSlug}/round-completions`)
      ])

      let participantsWithScores: any[] = []

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json()
        setParticipants(data.participants || [])
        
        // Fetch detailed scores for each participant
        participantsWithScores = await Promise.all(
          (data.participants || []).map(async (p: Participant) => {
            const scoresRes = await fetch(`/api/events/${eventSlug}/participants/${p.id}/scores`)
            if (scoresRes.ok) {
              const scoresData = await scoresRes.json()
              return { ...p, scores: scoresData.scores || [] }
            }
            return { ...p, scores: [] }
          })
        )
        setParticipants(participantsWithScores)
      }

      let roundsData: any = null
      if (roundsRes.ok) {
        roundsData = await roundsRes.json()
        setRoundsConfig(roundsData.rounds || [])
      }

      // Check if all rounds completed
      if (completionsRes.ok && roundsRes.ok && roundsData) {
        const completionsData = await completionsRes.json()
        const totalRounds = roundsData.rounds?.length || 0
        
        if (totalRounds === 0 || participantsWithScores.length === 0) {
          setAllRoundsCompleted(false)
        } else {
          // Check if all rounds completed for all participants
          const completionMap = new Map<string, Set<number>>()
          completionsData.rows?.forEach((r: any) => {
            if (!completionMap.has(r.participantId)) {
              completionMap.set(r.participantId, new Set())
            }
            completionMap.get(r.participantId)!.add(r.roundNumber)
          })
          
          // Check all participants have completed all rounds
          const allComplete = participantsWithScores.length > 0 && participantsWithScores.every(p => {
            const completedRounds = completionMap.get(p.id) || new Set()
            return completedRounds.size === totalRounds
          })
          
          setAllRoundsCompleted(allComplete)
        }
      } else {
        setAllRoundsCompleted(false)
      }
    } catch (error: any) {
      toast.error('Failed to load data: ' + (error?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = (participantId: string, criterion: string, newValue: number) => {
    setEditingScores(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [criterion]: newValue
      }
    }))
  }

  const handleSave = async (participantId: string, criterion: string, originalValue: number) => {
    const newValue = editingScores[participantId]?.[criterion]
    if (newValue === undefined || newValue === originalValue) {
      return
    }

    if (!confirm(`Adjust score for ${participants.find(p => p.id === participantId)?.name} - ${criterion} from ${originalValue} to ${newValue}?`)) {
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/admin/score/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug,
          participantId,
          criterion,
          newValue,
          reason: prompt('Reason for adjustment (optional):') || undefined
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to adjust score')
      }

      toast.success('Score adjusted successfully')
      await fetchData()
      // Clear editing state for this score
      setEditingScores(prev => {
        const next = { ...prev }
        if (next[participantId]) {
          delete next[participantId][criterion]
          if (Object.keys(next[participantId]).length === 0) {
            delete next[participantId]
          }
        }
        return next
      })
    } catch (error: any) {
      toast.error('Failed to adjust score: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!allRoundsCompleted) {
    return (
      <div className="min-h-screen bg-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href={`/e/${eventSlug}/admin`} className="text-slate-400 hover:text-white mb-4 inline-block">
            ← Back to Admin
          </Link>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">Score Adjustment Not Available</h2>
            <p className="text-slate-300">
              Score adjustments can only be made after all rounds are completed for all participants in the event.
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Please ensure all judges have submitted scores for all rounds before attempting to adjust scores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Get unique criteria from all scores
  const allCriteria = Array.from(
    new Set(participants.flatMap(p => p.scores.map(s => s.criterion)))
  ).sort()

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/e/${eventSlug}/admin`} className="text-slate-400 hover:text-white">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-white">Score Adjustment</h1>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
          <p className="text-green-400 text-sm">
            ✓ All rounds completed. Score adjustments are now enabled.
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Participant</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Type</th>
                {allCriteria.map(criterion => (
                  <th key={criterion} className="px-4 py-3 text-center text-sm font-semibold text-slate-300">
                    {criterion}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {participants.map(participant => {
                const participantScores = new Map(participant.scores.map(s => [s.criterion, s]))
                return (
                  <tr key={participant.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">#{participant.rank}</td>
                    <td className="px-4 py-3 font-medium text-white">{participant.name}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{participant.kind}</td>
                    {allCriteria.map(criterion => {
                      const score = participantScores.get(criterion)
                      const originalValue = score?.value ?? 0
                      const editedValue = editingScores[participant.id]?.[criterion]
                      const currentValue = editedValue !== undefined ? editedValue : originalValue
                      const isEdited = editedValue !== undefined && editedValue !== originalValue

                      return (
                        <td key={criterion} className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              value={currentValue}
                              onChange={(e) => handleScoreChange(participant.id, criterion, Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center"
                              min={0}
                            />
                            {isEdited && (
                              <button
                                onClick={() => handleSave(participant.id, criterion, originalValue)}
                                disabled={saving}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                              >
                                Save
                              </button>
                            )}
                            {isEdited && (
                              <button
                                onClick={() => {
                                  setEditingScores(prev => {
                                    const next = { ...prev }
                                    if (next[participant.id]) {
                                      delete next[participant.id][criterion]
                                    }
                                    return next
                                  })
                                }}
                                className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          {isEdited && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Original: {originalValue}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right font-bold text-blue-400">
                      {participant.totalScore}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

