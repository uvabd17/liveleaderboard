'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrandingUpload } from '@/components/branding-upload'
import toast from 'react-hot-toast'

interface Participant {
  id: string
  name: string
  kind: string
  profile: any
  event: {
    id: string
    name: string
    slug: string
    description: string | null
    startAt: string | null
    endAt: string | null
    organization: {
      name: string
    }
  }
  totalScore: number
  rank: number
}

export default function ParticipantDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const eventSlug = params.eventSlug as string
  const token = params.token as string

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [teamName, setTeamName] = useState('')
  const [idea, setIdea] = useState('')
  const [roundsConfig, setRoundsConfig] = useState<any[]>([])
  const [completedRounds, setCompletedRounds] = useState<number[]>([])
  const [participantCompletions, setParticipantCompletions] = useState<any[]>([])

  useEffect(() => {
    if (token) {
      fetchParticipantData()
    }
  }, [token])

  const fetchParticipantData = async () => {
    try {
      const response = await fetch(`/api/participant/${token}`)
      if (response.ok) {
        const data = await response.json()
        setParticipant(data.participant)
        setTeamName(data.participant.name)
        
        // Load team members from profile
        const profile = data.participant.profile || {}
        if (profile.teamMembers && Array.isArray(profile.teamMembers)) {
          setTeamMembers(profile.teamMembers)
        } else {
          setTeamMembers([])
        }
        if (profile.idea) {
          setIdea(profile.idea)
        } else {
          setIdea('')
        }
        // fetch event config and completions
        try {
          const [eventRes, compRes] = await Promise.all([
            fetch(`/api/events/${eventSlug}`),
            fetch(`/api/judge/score?participantId=${data.participant.id}`)
          ])
          if (eventRes.ok) {
            const je = await eventRes.json()
            const rules = (je.event?.rules || {}) as any
            setRoundsConfig(Array.isArray(rules.rounds) ? rules.rounds : [])
          }
          if (compRes.ok) {
            const jc = await compRes.json()
            setCompletedRounds(Array.isArray(jc.completedRounds) ? jc.completedRounds : [])
          }

          // fetch detailed completion rows for timestamps
          const allCompsRes = await fetch(`/api/events/${eventSlug}/round-completions`)
          if (allCompsRes.ok) {
            const ac = await allCompsRes.json()
            const rows = Array.isArray(ac.rows) ? ac.rows.filter((r: any) => r.participantId === data.participant.id) : []
            setParticipantCompletions(rows)
          }
        } catch (e) {
          // ignore
        }
      } else {
        toast.error('Invalid access token')
        router.push(`/e/${eventSlug}`)
      }
    } catch (error) {
      console.error('Failed to fetch participant data:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (logoData: string | null, colors: { primary: string; secondary: string; accent: string } | null) => {
    try {
      const response = await fetch('/api/participant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          profile: {
            logo: logoData,
            brandColors: colors,
            teamMembers,
            idea,
          },
        }),
      })

      if (response.ok) {
        toast.success('Profile updated!')
        fetchParticipantData()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleSaveTeamMembers = async () => {
    try {
      const response = await fetch('/api/participant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          profile: {
            teamMembers,
            idea,
          },
        }),
      })

      if (response.ok) {
        toast.success('Team members updated!')
        setEditing(false)
        fetchParticipantData()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      toast.error('Failed to update team members')
    }
  }

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, ''])
  }

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index))
  }

  const updateTeamMember = (index: number, value: string) => {
    const updated = [...teamMembers]
    updated[index] = value
    setTeamMembers(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">Invalid access token</p>
          <Link href={`/e/${eventSlug}`} className="text-blue-400 hover:text-blue-300">
            Back to Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  const profile = participant.profile || {}

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Participant Dashboard</h1>
              <p className="text-slate-400 text-sm">{participant.event.name}</p>
            </div>
            <Link
              href={`/e/${eventSlug}`}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              Back to Leaderboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Current Rank</div>
              <div className="text-3xl font-bold text-white">#{participant.rank}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Total Score</div>
              <div className="text-3xl font-bold text-blue-400">{participant.totalScore}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Type</div>
              <div className="text-xl font-semibold text-white capitalize">{participant.kind}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rounds / Completion Status */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Rounds & Completion</h2>
            {roundsConfig.length === 0 ? (
              <div className="text-slate-400">No round configuration available.</div>
            ) : (
              <ul className="space-y-3">
                  {roundsConfig.map((r: any, idx: number) => {
                  const rn = idx + 1
                  const completed = completedRounds.includes(rn)
                  const detail = participantCompletions.find((c: any) => c.roundNumber === rn)
                  return (
                    <li key={idx} className="flex justify-between items-center bg-slate-700 p-3 rounded">
                      <div>
                        <div className="text-white font-semibold">{r.name || `Round ${rn}`}</div>
                        <div className="text-slate-400 text-sm">Duration: {r.roundDurationMinutes ?? '-'} min</div>
                      </div>
                      <div className="text-right">
                        {completed ? (
                          <div className="text-green-400 font-semibold">Completed</div>
                        ) : (
                          <div className="text-yellow-300">Not completed</div>
                        )}
                        {detail && (
                          <div className="text-slate-400 text-xs mt-1">{new Date(detail.completedAt).toLocaleString()} · {detail.durationSeconds ?? '-'}s</div>
                        )}
                        {detail && Array.isArray(detail.comments) && detail.comments.length > 0 && (
                          <div className="text-slate-300 text-xs mt-2">
                            <div className="font-semibold text-slate-200">Judge Comments</div>
                            <ul className="mt-1 space-y-1">
                              {detail.comments.map((c: any, i: number) => (
                                <li key={i} className="text-slate-400">{(c.judgeUserId || 'judge')}: {c.comment || '—'}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {/* Profile Section */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Profile</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {participant.kind === 'team' ? 'Team Name' : 'Name'}
                </label>
                <div className="text-lg font-semibold text-white">{participant.name}</div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {participant.kind === 'team' ? 'Team Logo' : 'Photo'}
                </label>
                <BrandingUpload
                  currentLogo={profile.logo || null}
                  currentColors={profile.brandColors || null}
                  onUpload={handleProfileUpdate}
                  label={participant.kind === 'team' ? 'Team Logo' : 'Photo'}
                />
              </div>

              {/* Team Members (only for teams) */}
              {participant.kind === 'team' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Team Members (Dashboard Only)
                    </label>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {editing ? (
                    <div className="space-y-2">
                      {teamMembers.map((member, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={member}
                            onChange={(e) => updateTeamMember(index, e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                            placeholder="Member name"
                          />
                          <button
                            onClick={() => removeTeamMember(index)}
                            className="px-3 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button
                          onClick={addTeamMember}
                          className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white hover:bg-slate-600"
                        >
                          + Add Member
                        </button>
                        <button
                          onClick={handleSaveTeamMembers}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditing(false)
                            fetchParticipantData()
                          }}
                          className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teamMembers.length > 0 ? (
                        teamMembers.map((member, index) => (
                          <div key={index} className="px-3 py-2 bg-slate-700 rounded text-white">
                            {member}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-sm">No team members added yet</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Idea / Solution */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Idea / Solution (visible to judges)
                  </label>
                  <button
                    onClick={handleSaveTeamMembers}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Save
                  </button>
                </div>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Briefly describe what you're presenting."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Event Details & Links */}
          <div className="space-y-6">
            {/* Event Details */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Event Details</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-slate-400">Event</div>
                  <div className="text-white font-medium">{participant.event.name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Organization</div>
                  <div className="text-white">{participant.event.organization.name}</div>
                </div>
                {participant.event.description && (
                  <div>
                    <div className="text-sm text-slate-400">Description</div>
                    <div className="text-white text-sm">{participant.event.description}</div>
                  </div>
                )}
                {participant.event.startAt && (
                  <div>
                    <div className="text-sm text-slate-400">Start Date</div>
                    <div className="text-white text-sm">
                      {new Date(participant.event.startAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Quick Links</h2>
              <div className="space-y-3">
                <Link
                  href={`/e/${eventSlug}`}
                  className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium transition-colors"
                >
                  View Leaderboard
                </Link>
                <Link
                  href={`/e/${eventSlug}/stage`}
                  className="block w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center font-medium transition-colors"
                >
                  Stage Display
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}



