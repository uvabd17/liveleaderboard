'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { EventNavigation } from '@/components/event-navigation'
import { EventCache } from '@/lib/cache'
import { useAuth } from '@/lib/auth-context'

interface Participant {
  id: string
  name: string
  kind: string
}

interface Criterion {
  name: string
  maxPoints: number
  weight: number
  description: string
}

interface Event {
  id: string
  name: string
  slug: string
  rules: {
    rubric: Criterion[]
  }
  currentRound?: number
}

export default function JudgeConsolePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { role } = useAuth()
  const eventSlug = params.eventSlug as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [selectedCompleted, setSelectedCompleted] = useState<boolean>(false)
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number>(1)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  
  const cache = EventCache.getInstance()

  useEffect(() => {
    // Block admin access to judge console unless they registered as a judge
    try {
      const isJudgeFlag = localStorage?.getItem('user-role-judge')
      if (role === 'admin' && isJudgeFlag !== 'true') return
    } catch (e) {
      if (role === 'admin') return
    }

    if (status === 'unauthenticated') {
      router.push(`/judge/access?eventSlug=${eventSlug}`)
      return
    }
    if (status === 'authenticated') {
      fetchJudgeData()
    }
  }, [status, role, eventSlug, router])

  const fetchJudgeData = async () => {
    // Try cache first
    const cacheKey = `judge_data_${eventSlug}`
    const cached = cache.get(cacheKey)
    
    if (cached) {
      setEvent(cached.event)
      setParticipants(cached.participants)
      const initialScores: Record<string, number> = {}
      cached.event.rules?.rubric?.forEach((criterion: Criterion) => {
        initialScores[criterion.key ?? (criterion.name as any)] = 0
      })
      setScores(initialScores)
      // set selected round to current round from cache
      setSelectedRoundNumber((cached.event.currentRound ?? 0) + 1)
      setLoading(false)
    }

    try {
      const [eventRes, participantsRes] = await Promise.all([
        fetch(`/api/events/${eventSlug}`),
        fetch(`/api/events/${eventSlug}/participants`)
      ])

      if (eventRes.ok) {
        const eventData = await eventRes.json()
        setEvent(eventData.event)
        
        // Initialize scores with 0
        const initialScores: Record<string, number> = {}
        eventData.event.rules?.rubric?.forEach((criterion: Criterion) => {
          initialScores[criterion.key ?? (criterion.name as any)] = 0
        })
        setScores(initialScores)

        if (participantsRes.ok) {
          const participantsData = await participantsRes.json()
          setParticipants(participantsData.participants)
          
          // Cache the data
          cache.set(cacheKey, {
            event: eventData.event,
            participants: participantsData.participants
          }, 2 * 60 * 1000)
          // ensure selected round reflects currentRound
          setSelectedRoundNumber((eventData.event.currentRound ?? 0) + 1)
        }
      }

        // watch selection to fetch completion status for the selected participant
        useEffect(() => {
          if (!selectedParticipant) {
            setSelectedCompleted(false)
            return
          }
          fetch(`/api/judge/score?participantId=${selectedParticipant}&roundNumber=${selectedRoundNumber}`).then(r => r.json()).then(d => {
            setSelectedCompleted(!!d.completedCurrentRound)
          }).catch(()=>{})
        }, [selectedParticipant, selectedRoundNumber])
    } catch (error) {
      console.error('Failed to fetch judge data:', error)
      toast.error('Failed to load judging data')
    } finally {
      setLoading(false)
    }
  }

  // Per-criterion feedback inputs removed; use centralized Comments box below

  const handleScoreChange = (criterionName: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [criterionName]: value
    }))
  }

  const handleSubmit = async () => {
    if (!selectedParticipant) {
      toast.error('Please select a participant')
      return
    }

    if (selectedCompleted) {
      toast.error('Participant already completed this round')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/judge/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug,
          participantId: selectedParticipant,
          scores,
          comment,
          roundNumber: selectedRoundNumber,
        })
      })

      if (response.ok) {
        toast.success('Scores submitted successfully!')
        setScores({})
        setComment('')
        setSelectedParticipant(null)
        // Re-initialize scores
        event?.rules?.rubric?.forEach((criterion: Criterion) => {
          setScores(prev => ({ ...prev, [criterion.key ?? (criterion.name as any)]: 0 }))
        })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit scores')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  // Block admin access
  try {
    const isJudgeFlag = localStorage?.getItem('user-role-judge')
    if (role === 'admin' && isJudgeFlag !== 'true') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚖️</div>
            <h1 className="text-2xl font-bold text-white mb-2">Judge Console Access Restricted</h1>
            <p className="text-slate-400 mb-4">
              The judge console is only available to judges. Admins should use the admin dashboard to manage events.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Link
                href={`/e/${eventSlug}/admin`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Admin Dashboard
              </Link>
              <Link
                href={`/e/${eventSlug}`}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      )
    }
  } catch (e) {
    if (role === 'admin') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚖️</div>
            <h1 className="text-2xl font-bold text-white mb-2">Judge Console Access Restricted</h1>
            <p className="text-slate-400 mb-4">
              The judge console is only available to judges. Admins should use the admin dashboard to manage events.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Link
                href={`/e/${eventSlug}/admin`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Admin Dashboard
              </Link>
              <Link
                href={`/e/${eventSlug}`}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      )
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading judge console...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">You don't have permission to judge this event.</p>
          <Link href={`/e/${eventSlug}`} className="text-blue-400 hover:text-blue-300">
            Back to Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  // Normalize rubric shape (support older/newer schema shapes)
  const rawRubric = event.rules?.rubric || []
  const rubric = rawRubric.map((r: any) => ({
    key: r.key ?? r.name ?? (r.label ? r.label.toLowerCase().replace(/\s+/g, '_') : Math.random().toString(36).slice(2,8)),
    label: r.label ?? r.name ?? r.key ?? 'Criterion',
    maxPoints: Number(r.max ?? r.maxPoints ?? 100),
    weight: Number(r.weight ?? 1),
    description: r.description ?? '',
    rounds: Array.isArray(r.rounds) ? r.rounds : null,
    scale: r.scale ?? (r.type === 'range' ? 'range' : 'number')
  }))
  const roundsConfig = Array.isArray((event.rules as any)?.rounds) ? (event.rules as any).rounds : []
  const currentRoundNumber = (event.currentRound ?? 0) + 1
  const displayRubric = rubric.filter((c) => !c.rounds || c.rounds.includes(selectedRoundNumber))

  const totalPossibleScore = displayRubric.reduce((sum, c) => sum + (c.maxPoints || 0), 0)
  const currentTotal = Object.values(scores).reduce((sum, s) => sum + s, 0)

  useEffect(() => {
    // initialize scores for the currently selected round's rubric
    const initial: Record<string, number> = {}
    displayRubric.forEach((c) => {
      initial[c.key] = scores[c.key] ?? 0
    })
    setScores(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoundNumber, event?.rules?.rubric?.length])

  // Filter participants by search query
  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.kind.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedParticipantData = participants.find(p => p.id === selectedParticipant)

  return (
    <div className="min-h-screen bg-slate-900">
      <EventNavigation />
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push(`/e/${eventSlug}/admin`)}
                className="text-slate-400 hover:text-white mb-2 flex items-center gap-2 text-sm"
              >
                ← Back to Admin
              </button>
              <h1 className="text-2xl font-bold text-white">⚖️ Judge Console</h1>
              <p className="text-slate-400 text-sm">{event.name}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-semibold">
                  Round {selectedRoundNumber}{roundsConfig.length ? ` / ${roundsConfig.length}` : ''}
                </span>
                {roundsConfig.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <label className="text-slate-400 text-xs">Select round</label>
                    <select
                      value={selectedRoundNumber}
                      onChange={(e) => setSelectedRoundNumber(Number(e.target.value))}
                      className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm"
                    >
                      {roundsConfig.map((r: any, idx: number) => (
                        <option key={idx} value={idx + 1}>{r.name || `Round ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <Link
              href={`/e/${eventSlug}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Participant Selection with Search */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <label className="block text-lg font-semibold text-white mb-3">
            🔍 Select Participant to Score
          </label>
          
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or type..."
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <p className="text-xs text-slate-400 mt-2">
                Found {filteredParticipants.length} matching participant{filteredParticipants.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Selected Participant Display */}
          {selectedParticipantData && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white font-semibold text-lg">{selectedParticipantData.name}</div>
                  <div className="flex items-center gap-3">
                    <div className="text-blue-400 text-sm capitalize">{selectedParticipantData.kind}</div>
                    {selectedCompleted ? (
                      <div className="text-green-400 text-sm font-semibold">✅ Completed this round</div>
                    ) : (
                      <div className="text-yellow-300 text-sm">Not completed</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedParticipant(null)
                    setSearchQuery('')
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Change ✕
                </button>
              </div>
            </div>
          )}

          {/* Participant List (show only when no participant selected) */}
          {!selectedParticipant && (
            <div className="max-h-96 overflow-y-auto">
              {filteredParticipants.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  {searchQuery ? 'No participants match your search' : 'No participants registered yet'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredParticipants.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedParticipant(p.id)}
                      className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-left transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium group-hover:text-blue-400 transition-colors">
                            {p.name}
                          </div>
                          <div className="text-slate-400 text-sm capitalize">{p.kind}</div>
                        </div>
                        <div className="text-slate-500 group-hover:text-blue-400 transition-colors">
                          →
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scoring Rubric */}
        {selectedParticipant && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Scoring Rubric</h2>
                
              </div>
              <div className="flex gap-4 pb-4 -mx-2 px-2 md:flex-row flex-col md:overflow-x-auto">
                {displayRubric.map((criterion, index) => (
                  <div
                    key={criterion.key || index}
                    className="rubric-card md:flex-shrink-0 min-w-0 w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-2">
                        <h3 className="text-base font-semibold text-white">{criterion.label}</h3>
                        {criterion.description && (
                          <p className="text-xs text-slate-400 mt-1">{criterion.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-xl font-bold text-blue-400">
                          {scores[criterion.key] || 0}
                        </div>
                        <div className="text-xs text-slate-500">/ {criterion.maxPoints}</div>
                      </div>
                    </div>

                    {/* Number Input for Score Entry */}
                    <div className="flex items-center justify-center py-2">
                      <input
                        aria-label={`Enter score for ${criterion.label}`}
                        placeholder="0"
                        type="number"
                        min={0}
                        max={criterion.maxPoints}
                        value={scores[criterion.key] ?? ''}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (e.target.value === '' || isNaN(v)) {
                            handleScoreChange(criterion.key, 0)
                          } else {
                            handleScoreChange(criterion.key, Math.max(0, Math.min(criterion.maxPoints, v)))
                          }
                        }}
                        className="w-14 px-2 py-1 rounded-lg bg-slate-700 border-2 border-slate-600 text-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    
                  </div>
                ))}
              </div>

              {/* Total Score */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total Score</span>
                  <div className="text-3xl font-bold text-green-400">
                    {currentTotal} <span className="text-slate-500 text-xl">/ {totalPossibleScore}</span>
                  </div>
                </div>
                <div className="mt-3 w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTotal / totalPossibleScore) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <label className="block text-lg font-semibold text-white mb-3">
                Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Provide feedback or notes about this participant..."
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedParticipant}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              style={{ minHeight: '56px' }}
            >
              {submitting ? 'Submitting Scores...' : '✓ Submit Scores'}
            </button>
          </div>
        )}

        {!selectedParticipant && rubric.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <div className="text-6xl mb-4">👆</div>
            <p className="text-slate-400 text-lg">
              Select a participant above to start scoring
            </p>
          </div>
        )}
      </main>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: none;
        }
        @media (min-width: 768px) {
          /* Fix rubric cards to a fifth of the container so five are visible without scrolling */
          .rubric-card {
            width: calc((100% - 4rem) / 5);
            max-width: calc((100% - 4rem) / 5);
            flex-shrink: 0;
            min-width: 0;
            max-height: 10rem;
            overflow: hidden;
          }
          .rubric-card textarea {
            max-height: 4.5rem;
          }
        }
      `}</style>
    </div>
  )
}
