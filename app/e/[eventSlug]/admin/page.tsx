'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { BrandingUpload } from '@/components/branding-upload'

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  currentRound?: number | null
  logoUrl?: string | null
  brandColors?: { primary: string; secondary: string; accent: string } | null
  organization: {
    name: string
  }
  _count: {
    participants: number
    judges: number
  }
}

interface Participant {
  id: string
  name: string
  kind: string
  totalScore: number
  rank: number
}

type AdminTab = 'overview' | 'participants' | 'judges' | 'settings' | 'branding'

export default function EventAdminPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const eventSlug = params.eventSlug as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [features, setFeatures] = useState<any | null>(null)
  const [rules, setRules] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [showQR, setShowQR] = useState(false)
  const [showManualRegister, setShowManualRegister] = useState(false)
  const [judgeInvite, setJudgeInvite] = useState<{ inviteUrl: string; token: string } | null>(null)
  const [registrationToken, setRegistrationToken] = useState<{ url: string; token: string } | null>(null)
  const [tokens, setTokens] = useState<Array<any>>([])
  const [qrTab, setQrTab] = useState<'leaderboard' | 'stage' | 'registration' | 'judge'>('leaderboard')
  const [judges, setJudges] = useState<Array<any>>([])
  const [registrationLink, setRegistrationLink] = useState<string | null>(null)
  const [registrationLinkLoading, setRegistrationLinkLoading] = useState<boolean>(false)
  const [roundCompletions, setRoundCompletions] = useState<Record<string, Set<number>>>({}) // participantId -> Set of completed round numbers
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | null>(null)
  const [completionSort, setCompletionSort] = useState<'all' | 'completed' | 'incomplete'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchEventData()
    }
  }, [status, eventSlug])

  useEffect(() => {
    if (showQR && qrTab === 'registration') {
      ensureRegistrationLink()
    }
  }, [showQR, qrTab])

  const fetchEventData = async () => {
    try {
      const [eventRes, leaderboardRes] = await Promise.all([
        fetch(`/api/events/${eventSlug}`),
        fetch(`/api/events/${eventSlug}/leaderboard`)
      ])

      if (eventRes.ok) {
        const eventData = await eventRes.json()
        setEvent(eventData.event)
        setJudges(eventData.event?.judges || [])
      }

      try {
        const settingsRes = await fetch(`/api/event/settings?eventSlug=${eventSlug}`)
        if (settingsRes.ok) {
          const sd = await settingsRes.json()
          setFeatures(sd.features || null)
          setRules(sd.rules || null)
        }
      } catch (err) {
        console.warn('failed to fetch settings', err)
      }

      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json()
        setParticipants(leaderboardData.participants)
      }

      // Fetch round completions for all participants
      try {
        const completionsRes = await fetch(`/api/events/${eventSlug}/round-completions`)
        if (completionsRes.ok) {
          const completionsData = await completionsRes.json()
          const completionMap: Record<string, Set<number>> = {}
          if (Array.isArray(completionsData.rows)) {
            completionsData.rows.forEach((r: any) => {
              if (r.participantId && r.roundNumber) {
                if (!completionMap[r.participantId]) {
                  completionMap[r.participantId] = new Set()
                }
                completionMap[r.participantId].add(r.roundNumber)
              }
            })
          }
          setRoundCompletions(completionMap)
        }
      } catch (err) {
        console.warn('failed to fetch completions', err)
      }

      try {
        const tRes = await fetch(`/api/events/${eventSlug}/register-tokens`)
        if (tRes.ok) {
          const d = await tRes.json()
          setTokens(d.tokens || [])
          // Prefer a reusable public token for kiosk-style registration
          const publicToken = d.tokens?.find((t: any) => t.public)
          if (publicToken?.token) {
            setRegistrationLink(`${window.location.origin}/e/${eventSlug}/register?token=${encodeURIComponent(publicToken.token)}`)
          }
        }
      } catch (err) {
        console.warn('failed to fetch tokens', err)
      }

    } catch (error) {
      console.error('Failed to fetch event data:', error)
      toast.error('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const updateRules = async (newRules: any) => {
    try {
      const res = await fetch('/api/event/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventSlug, rules: newRules }) })
      if (!res.ok) throw new Error('update_failed')
      setRules(newRules)
      toast.success('Settings updated')
    } catch (err) {
      console.error('Failed to update rules', err)
      toast.error('Failed to update settings')
    }
  }

  const handleBrandingUpload = async (logoData: string | null, colors: { primary: string; secondary: string; accent: string } | null) => {
    try {
      const response = await fetch('/api/event/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug, logoData, extractColors: true, brandColors: colors }),
      })
      if (response.ok) {
        const data = await response.json()
        setEvent({ ...event!, logoUrl: data.logoUrl, brandColors: data.brandColors })
        toast.success('Branding updated!')
        fetchEventData()
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      toast.error('Failed to update branding')
    }
  }

  const handleBrandingRemove = async () => {
    try {
      const response = await fetch(`/api/event/logo?eventSlug=${eventSlug}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setEvent({ ...event!, logoUrl: null, brandColors: null })
        toast.success('Branding removed')
        fetchEventData()
      } else {
        throw new Error('Remove failed')
      }
    } catch (error) {
      toast.error('Failed to remove branding')
    }
  }

  const showLeaderboardTab = !(features?.operations?.hideLeaderboardUntilRegistrationClosed && !rules?.registrationClosed)
  const publicURL = typeof window !== 'undefined' ? `${window.location.origin}/e/${eventSlug}` : ''

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const ensureRegistrationLink = async () => {
    if (registrationLink || registrationLinkLoading) return
    setRegistrationLinkLoading(true)
    try {
      const res = await fetch(`/api/events/${eventSlug}/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: true, usesLeft: null, expiresInMinutes: 60 * 24 }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Failed to create registration link')
      setRegistrationLink(data.url)
      setRegistrationToken({ url: data.url, token: data.token })
    } catch (err) {
      console.error('Failed to issue registration link', err)
      toast.error('Could not generate registration QR')
    } finally {
      setRegistrationLinkLoading(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">You don't have permission to manage this event.</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'participants', label: 'Participants', icon: '👥' },
    { id: 'judges', label: 'Judges', icon: '⚖️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
  ]

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/dashboard" className="text-slate-400 hover:text-white">
                  ← Dashboard
                </Link>
                <span className="text-slate-600">/</span>
                <span className="text-white font-medium">{event.name}</span>
              </div>
              <p className="text-sm text-slate-400">{event.organization.name}</p>
            </div>
            <Link
              href={`/e/${eventSlug}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              target="_blank"
            >
              View Public Page →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Tab Navigation */}
        <div className="glass-panel mb-6">
          <div className="flex border-b border-slate-700 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-6">
                  <div className="text-slate-400 text-sm mb-1">Participants</div>
                  <div className="text-3xl font-bold text-white">{event._count.participants}</div>
                </div>
                <div className="glass-panel p-6">
                  <div className="text-slate-400 text-sm mb-1">Judges</div>
                  <div className="text-3xl font-bold text-purple-400">{event._count.judges}</div>
                </div>
                <div className="glass-panel p-6">
                  <div className="text-slate-400 text-sm mb-1">Avg Score</div>
                  <div className="text-3xl font-bold text-green-400">
                    {participants.length > 0
                      ? Math.round(participants.reduce((sum, p) => sum + p.totalScore, 0) / participants.length)
                      : 0
                    }
                  </div>
                </div>
                <div className="glass-panel p-6">
                  <div className="text-slate-400 text-sm mb-1">Status</div>
                  <div className="text-2xl font-bold text-green-400">🟢 Active</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel p-6">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => { setShowQR(true); setQrTab('registration') }}
                    className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    <div className="text-4xl">📱</div>
                    <div className="text-white font-medium">Generate QR</div>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/judge/invite', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ eventId: event.id, expiresInMinutes: 60 })
                        })
                        if (!res.ok) throw new Error('invite_failed')
                        const data = await res.json()
                        setJudgeInvite({ inviteUrl: data.invite.inviteUrl, token: data.invite.token })
                        setQrTab('judge')
                        setShowQR(true)
                        toast.success('Judge invite generated')
                      } catch (err) {
                        toast.error('Failed to create judge invite')
                      }
                    }}
                    className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    <div className="text-4xl">✉️</div>
                    <div className="text-white font-medium">Invite Judge</div>
                  </button>
                  <Link
                    href={`/e/${eventSlug}/admin/rubric`}
                    className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    <div className="text-4xl">📋</div>
                    <div className="text-white font-medium">Rubric</div>
                  </Link>
                  <button
                    onClick={() => setShowManualRegister(true)}
                    className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    <div className="text-4xl">✍️</div>
                    <div className="text-white font-medium">Manual Register</div>
                  </button>
                  <Link
                    href={`/e/${eventSlug}/admin/score-adjust`}
                    className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    <div className="text-4xl">✏️</div>
                    <div className="text-white font-medium">Adjust Scores</div>
                  </Link>
                  <Link
                    href={`/e/${eventSlug}/admin/rounds`}
                    className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    <div className="text-4xl">🔄</div>
                    <div className="text-white font-medium">Rounds & Timers</div>
                  </Link>
                </div>
              </div>

              {/* Registration Control */}
              <div className="glass-panel p-6">
                <h2 className="text-xl font-bold text-white mb-4">📝 Registration Control</h2>
                <div className={`p-5 rounded-lg border-2 transition-all ${rules?.registrationClosed
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-green-500 bg-green-500/10'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-3xl ${rules?.registrationClosed ? 'animate-pulse' : ''}`}>
                        {rules?.registrationClosed ? '🔒' : '✅'}
                      </div>
                      <div>
                        <h3 className={`text-lg font-bold mb-1 ${rules?.registrationClosed ? 'text-red-400' : 'text-green-400'
                          }`}>
                          {rules?.registrationClosed ? 'Registrations Closed' : 'Registrations Open'}
                        </h3>
                        <p className="text-sm text-slate-300">
                          {rules?.registrationClosed
                            ? 'New participants cannot register'
                            : 'Participants can register via link or QR code'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !rules?.registrationClosed
                        const next = { ...(rules || {}), registrationClosed: newVal }
                        await updateRules(next)
                      }}
                      className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${rules?.registrationClosed
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    >
                      {rules?.registrationClosed ? '🔓 Open' : '🔒 Close'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="glass-panel overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Participants</h2>
                  <button
                    onClick={() => setShowManualRegister(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    + Add Participant
                  </button>
                </div>

                {/* Filters */}
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Filter by Round:</label>
                    <select
                      value={selectedRoundFilter ?? ''}
                      onChange={(e) => setSelectedRoundFilter(e.target.value ? Number(e.target.value) : null)}
                      className="glass-input py-1 px-3 text-sm"
                    >
                      <option value="">All Rounds</option>
                      {Array.isArray(rules?.rounds) && rules.rounds.map((r: any, idx: number) => (
                        <option key={idx} value={idx + 1}>Round {idx + 1}: {r.name || `Round ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Sort:</label>
                    <select
                      value={completionSort}
                      onChange={(e) => setCompletionSort(e.target.value as any)}
                      className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm"
                    >
                      <option value="all">All</option>
                      <option value="completed">Completed First</option>
                      <option value="incomplete">Incomplete First</option>
                    </select>
                  </div>
                </div>
              </div>

              {participants.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-slate-400 mb-4">No participants yet</p>
                  <button
                    onClick={() => { setShowQR(true); setQrTab('registration') }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Generate Registration QR
                  </button>
                </div>
              ) : (() => {
                // Filter and sort participants
                const currentRound = event?.currentRound ?? 0
                const filterRound = selectedRoundFilter ?? (currentRound > 0 ? currentRound + 1 : null)

                let filtered = participants.map(p => {
                  const completedRounds = roundCompletions[p.id] || new Set<number>()
                  const isCompleted = filterRound ? completedRounds.has(filterRound) : false
                  const completedCount = completedRounds.size
                  const totalRounds = Array.isArray(rules?.rounds) ? rules.rounds.length : 0

                  return { ...p, isCompleted, completedCount, totalRounds }
                })

                // Apply completion filter
                if (completionSort === 'completed') {
                  filtered.sort((a, b) => {
                    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1
                    return a.rank - b.rank
                  })
                } else if (completionSort === 'incomplete') {
                  filtered.sort((a, b) => {
                    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1
                    return a.rank - b.rank
                  })
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Rank</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Type</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Score</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Rounds Completed</th>
                          {filterRound && (
                            <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">
                              Round {filterRound} Status
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {filtered.map((participant) => {
                          const completedRounds = roundCompletions[participant.id] || new Set<number>()
                          const isCompleted = filterRound ? completedRounds.has(filterRound) : false
                          const completedCount = completedRounds.size
                          const totalRounds = Array.isArray(rules?.rounds) ? rules.rounds.length : 0

                          return (
                            <tr key={participant.id} className={`hover:bg-white/5 ${isCompleted ? 'bg-green-500/5' : ''}`}>
                              <td className="px-6 py-4 text-slate-300">#{participant.rank}</td>
                              <td className="px-6 py-4 font-medium text-white">{participant.name}</td>
                              <td className="px-6 py-4 text-slate-400 capitalize">{participant.kind}</td>
                              <td className="px-6 py-4 text-right font-bold text-blue-400">{participant.totalScore}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-slate-300 text-sm">
                                  {completedCount} / {totalRounds || '?'}
                                </span>
                              </td>
                              {filterRound && (
                                <td className="px-6 py-4 text-center">
                                  {isCompleted ? (
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">
                                      ✓ Completed
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-300">
                                      ⏳ Pending
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Judges Tab */}
          {activeTab === 'judges' && (
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Judges</h2>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/judge/invite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventId: event.id, expiresInMinutes: 60 })
                      })
                      if (!res.ok) throw new Error('invite_failed')
                      const data = await res.json()
                      setJudgeInvite({ inviteUrl: data.invite.inviteUrl, token: data.invite.token })
                      setQrTab('judge')
                      setShowQR(true)
                      toast.success('Judge invite generated')
                    } catch (err) {
                      toast.error('Failed to create judge invite')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  + Invite Judge
                </button>
              </div>
              <p className="text-slate-400 mb-4">Manage judges and generate invite codes for the judge console.</p>
              <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                <p className="text-slate-300 text-sm">
                  Use the "Invite Judge" button to generate a shareable link and QR code for judges.
                </p>
              </div>
              {judges.length === 0 ? (
                <div className="text-slate-400 text-sm">No judges yet. Invite one to get started.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-200">Name</th>
                        <th className="px-4 py-3 text-left text-slate-200">Email</th>
                        <th className="px-4 py-3 text-left text-slate-200">Role</th>
                        <th className="px-4 py-3 text-left text-slate-200">Status</th>
                        <th className="px-4 py-3 text-left text-slate-200">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {judges.map((j) => (
                        <tr key={j.id} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-white font-medium">{j.name || 'Unnamed'}</td>
                          <td className="px-4 py-3 text-slate-300">{j.email || '—'}</td>
                          <td className="px-4 py-3 text-slate-300 capitalize">{j.role || 'judge'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${j.active ? 'bg-green-500/20 text-green-300' : 'bg-slate-600 text-slate-200'}`}>
                              {j.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {j.expiresAt ? new Date(j.expiresAt).toLocaleDateString() : 'No expiry'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-white mb-4">Event Settings</h2>
              <p className="text-slate-400 text-sm mb-4">
                Configure rounds, timers, judging locks, and elimination controls here. These replace the old round control center and keep everything in one place.
              </p>
              <div className="space-y-4">
                <Link
                  href={`/e/${eventSlug}/admin/settings`}
                  className="block p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                >
                  <div className="font-semibold text-white mb-1">⚙️ Advanced Settings</div>
                  <div className="text-sm text-slate-400">Configure rounds, judging modes, and advanced features</div>
                </Link>
                <Link
                  href={`/e/${eventSlug}/admin/rubric`}
                  className="block p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                >
                  <div className="font-semibold text-white mb-1">📋 Scoring Rubric</div>
                  <div className="text-sm text-slate-400">Edit scoring criteria and weights</div>
                </Link>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-white mb-4">Event Branding</h2>
              <p className="text-slate-400 mb-6">
                Upload a logo and customize your event's branding. Colors will be automatically extracted from your logo.
              </p>
              <BrandingUpload
                currentLogo={event.logoUrl || null}
                currentColors={event.brandColors || null}
                onUpload={handleBrandingUpload}
                onRemove={handleBrandingRemove}
                label="Event Logo"
              />
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Share Event</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {showLeaderboardTab && (
                <button
                  className={`px-3 py-2 rounded ${qrTab === 'leaderboard' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}
                  onClick={() => setQrTab('leaderboard')}
                >
                  Leaderboard
                </button>
              )}
              <button
                className={`px-3 py-2 rounded ${qrTab === 'stage' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}
                onClick={() => setQrTab('stage')}
              >
                Stage
              </button>
              <button
                className={`px-3 py-2 rounded ${qrTab === 'registration' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}
                onClick={() => setQrTab('registration')}
              >
                Registration
              </button>
              <button
                className={`px-3 py-2 rounded ${qrTab === 'judge' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}
                onClick={() => setQrTab('judge')}
              >
                Judge
              </button>
            </div>

            {qrTab === 'leaderboard' && (
              <div className="bg-slate-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-2">📊 Public Leaderboard</h4>
                <p className="text-sm text-slate-400 mb-4">Scan this QR to view the live leaderboard.</p>
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={publicURL} size={180} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-400 mb-2">URL</div>
                    <div className="flex gap-2">
                      <input type="text" value={publicURL} readOnly className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm" />
                      <button onClick={() => copyToClipboard(publicURL, 'Leaderboard URL')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Copy</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {qrTab === 'stage' && (
              <div className="bg-slate-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-2">📺 Stage Display</h4>
                <p className="text-sm text-slate-400 mb-4">Use this on the projector or stage display device.</p>
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={`${publicURL}/stage`} size={180} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-400 mb-2">URL</div>
                    <div className="flex gap-2">
                      <input type="text" value={`${publicURL}/stage`} readOnly className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm" />
                      <button onClick={() => copyToClipboard(`${publicURL}/stage`, 'Stage URL')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Copy</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {qrTab === 'registration' && (
              <div className="bg-slate-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-2">📝 Registration (Direct)</h4>
                <p className="text-sm text-slate-400 mb-4">This QR opens the registration form with a pre-issued token for this event—no extra kiosk step.</p>
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-lg">
                    {registrationLink ? (
                      <QRCodeSVG value={registrationLink} size={180} />
                    ) : (
                      <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-500">Issuing…</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-sm text-slate-400">URL</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={registrationLink || 'Issuing registration link...'}
                        readOnly
                        className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      />
                      <button
                        onClick={() => registrationLink && copyToClipboard(registrationLink, 'Registration URL')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                        disabled={!registrationLink}
                      >
                        Copy
                      </button>
                    </div>
                    <button
                      onClick={ensureRegistrationLink}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded font-medium disabled:opacity-50"
                      disabled={registrationLinkLoading}
                    >
                      {registrationLinkLoading ? 'Issuing token…' : 'Refresh registration token'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {qrTab === 'judge' && (
              <div className="bg-slate-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-2">⚖️ Invite Judge</h4>
                <p className="text-sm text-slate-400 mb-4">Share this link with judges.</p>
                {judgeInvite ? (
                  <div className="flex items-center gap-6">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG value={judgeInvite.inviteUrl} size={180} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-400 mb-2">Invite Link</div>
                      <div className="flex gap-2">
                        <input type="text" value={judgeInvite.inviteUrl} readOnly className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm" />
                        <button onClick={() => copyToClipboard(judgeInvite.inviteUrl, 'Judge Invite')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Copy</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No judge invite generated yet. Use the "Invite Judge" button to create one.</div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowQR(false)}
              className="w-full mt-6 px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Manual Register Modal */}
      {showManualRegister && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Manual Register</h3>
              <button onClick={() => setShowManualRegister(false)} className="text-slate-400">×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget as HTMLFormElement)
              const name = (fd.get('name') as string || '').trim()
              const kind = (fd.get('kind') as string) as 'team' | 'individual'
              if (!name || name.length < 2) { toast.error('Enter a valid name'); return }
              try {
                const res = await fetch(`/api/events/${eventSlug}/participants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, kind }) })
                const data = await res.json()
                if (!res.ok) { toast.error(data?.error || 'Failed'); return }
                toast.success('Participant added')
                setShowManualRegister(false)
                fetchEventData()
              } catch (err) {
                toast.error('Failed to add participant')
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Name</label>
                <input name="name" className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Type</label>
                <select name="kind" defaultValue="team" className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white">
                  <option value="team">Team</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
                <button type="button" onClick={() => setShowManualRegister(false)} className="px-4 py-2 bg-slate-600 text-white rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
