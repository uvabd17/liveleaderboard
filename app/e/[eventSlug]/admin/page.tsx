'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { BrandingUpload } from '@/components/branding-upload'
import { cn } from '@/lib/utils'
import { AdminNavbar } from '@/components/ui/admin-navbar'
import { PageLoading } from '@/components/loading-spinner'
import { RefreshCw, CheckCircle2, Radio, Send, BarChart3, Users, Scale, Radio as Broadcast, Settings as SettingsIcon, CheckCircle, Smartphone } from 'lucide-react'

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

type AdminTab = 'overview' | 'participants' | 'judges' | 'settings' | 'broadcast'

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
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [endingEvent, setEndingEvent] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'urgent'>('info')
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastHistory, setBroadcastHistory] = useState<Array<{ message: string; type: string; timestamp: number }>>([])
  const [showClosureSuggestion, setShowClosureSuggestion] = useState(false)
  const [closureDismissed, setClosureDismissed] = useState(false)

  // Check if all rounds are complete based on SCORING, not just timers
  const checkEventReadyToClose = (participantsCount: number, totalRounds: number, completions: Record<string, Set<number>>) => {
    if (!participantsCount || !totalRounds || features?.isEnded || closureDismissed) return false
    let totalCompletions = 0
    Object.values(completions).forEach(rounds => { totalCompletions += rounds.size })
    const expectedCompletions = participantsCount * totalRounds
    return totalCompletions >= expectedCompletions
  }

  // Check completion status whenever roundCompletions, participants, or rules change
  useEffect(() => {
    const totalRounds = Array.isArray(rules?.rounds) ? rules.rounds.length : 0
    const participantsCount = participants.length
    if (checkEventReadyToClose(participantsCount, totalRounds, roundCompletions)) {
      setShowClosureSuggestion(true)
    }
  }, [roundCompletions, participants, rules, features?.isEnded, closureDismissed])

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) return
    setBroadcastSending(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug, message: broadcastMessage.trim(), type: broadcastType })
      })
      if (!res.ok) throw new Error('Failed to send broadcast')
      setBroadcastHistory(prev => [
        { message: broadcastMessage.trim(), type: broadcastType, timestamp: Date.now() },
        ...prev.slice(0, 9)
      ])
      setBroadcastMessage('')
      toast.success('Broadcast sent!')
    } catch (err) {
      toast.error('Failed to send broadcast')
    } finally {
      setBroadcastSending(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const data = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = values[i] })
        return {
          name: obj.name || obj.participant || obj.team || '',
          kind: (obj.kind || obj.type || 'team').toLowerCase().includes('indiv') ? 'individual' : 'team'
        }
      }).filter(p => p.name)
      setImportPreview(data)
    }
    reader.readAsText(file)
  }

  const handleBulkImport = async () => {
    if (!importPreview.length || !event?.id) return
    setImporting(true)
    try {
      const res = await fetch('/api/admin/participants/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, participants: importPreview })
      })
      if (res.ok) {
        toast.success(`Imported ${importPreview.length} participants`)
        setShowBulkImport(false)
        setImportPreview([])
        fetchEventData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Import failed')
      }
    } catch (err) {
      toast.error('Connection error')
    } finally {
      setImporting(false)
    }
  }

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
    return <PageLoading message="Event Admin" submessage="Loading event configuration..." />
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-charcoal/5 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal mb-2">Access Denied</h1>
          <p className="text-charcoal/50 mb-8">You don't have permission to manage this event.</p>
          <Link href="/dashboard" className="text-charcoal hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'participants', label: 'Participants', icon: <Users className="w-4 h-4" /> },
    { id: 'judges', label: 'Judges', icon: <Scale className="w-4 h-4" /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Broadcast className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen pb-20 relative bg-cream dark:bg-charcoal">
      {/* Background gradients - subtle for cream theme */}
      <div className="fixed inset-0 pointer-events-none dark:opacity-100 opacity-30">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-charcoal/5 dark:bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-charcoal/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <AdminNavbar eventSlug={eventSlug} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 relative z-10">
        {/* Event Closure Suggestion Banner */}
        {showClosureSuggestion && !features?.isEnded && (
          <div className="mb-6 p-6 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/30 rounded-3xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-white">All Rounds Complete!</h3>
                  <p className="text-sm text-[#1A1A1A]/60 dark:text-slate-400">Your event appears ready to be finalized. Would you like to end the event?</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setClosureDismissed(true); setShowClosureSuggestion(false) }}
                  className="px-4 py-2 bg-[#1A1A1A]/10 dark:bg-white/10 hover:bg-[#1A1A1A]/20 dark:hover:bg-white/20 text-[#1A1A1A]/70 dark:text-slate-300 rounded-xl text-sm font-medium"
                >
                  Not Yet
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('End this event? This will show final results on all displays.')) return
                    setEndingEvent(true)
                    try {
                      const res = await fetch(`/api/events/${eventSlug}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ features: { ...features, isEnded: true } })
                      })
                      if (res.ok) {
                        toast.success('Event Ended!')
                        setShowClosureSuggestion(false)
                        fetchEventData()
                      } else { toast.error('Failed to end event') }
                    } catch (e) { toast.error('Connection error') } finally { setEndingEvent(false) }
                  }}
                  disabled={endingEvent}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  {endingEvent ? <><RefreshCw className="w-4 h-4 animate-spin" />Ending...</> : <><CheckCircle2 className="w-4 h-4" />End Event</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="card mb-6 overflow-hidden">
          <div className="flex px-2 py-1.5 overflow-x-auto gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2",
                  activeTab === tab.id
                    ? "bg-charcoal text-cream dark:bg-cream dark:text-charcoal"
                    : "text-charcoal/70 dark:text-white/80 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5"
                )}
              >
                <span className="opacity-70">{tab.icon}</span>
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
                <div className="card p-6">
                  <div className="text-charcoal/70 dark:text-white/80 text-xs uppercase tracking-wider mb-1">Participants</div>
                  <div className="text-3xl font-mono font-bold text-charcoal dark:text-white">{event._count.participants}</div>
                </div>
                <div className="card p-6">
                  <div className="text-charcoal/70 dark:text-white/80 text-xs uppercase tracking-wider mb-1">Judges</div>
                  <div className="text-3xl font-mono font-bold text-charcoal dark:text-white">{event._count.judges}</div>
                </div>
                <div className="card p-6">
                  <div className="text-charcoal/70 dark:text-white/80 text-xs uppercase tracking-wider mb-1">Avg Score</div>
                  <div className="text-3xl font-mono font-bold text-charcoal dark:text-white">
                    {participants.length > 0
                      ? Math.round(participants.reduce((sum, p) => sum + p.totalScore, 0) / participants.length)
                      : 0
                    }
                  </div>
                </div>
                <div className="card p-6">
                  <div className="text-charcoal/70 dark:text-white/80 text-xs uppercase tracking-wider mb-1">Status</div>
                  <div className="text-lg font-semibold text-emerald-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card p-6">
                <h2 className="font-display text-xl font-semibold text-charcoal dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => { setShowQR(true); setQrTab('registration') }}
                    className="flex flex-col items-center gap-2 p-6 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <Smartphone className="w-10 h-10 text-charcoal dark:text-cream" />
                    <div className="text-charcoal dark:text-white font-medium">Generate QR</div>
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
                    className="flex flex-col items-center gap-2 p-6 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="text-4xl">✉️</div>
                    <div className="text-charcoal dark:text-white font-medium">Invite Judge</div>
                  </button>
                  <Link
                    href={`/e/${eventSlug}/admin/rubric`}
                    className="flex flex-col items-center gap-2 p-6 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="text-4xl">📋</div>
                    <div className="text-charcoal dark:text-white font-medium">Rubric</div>
                  </Link>
                  <button
                    onClick={() => setShowManualRegister(true)}
                    className="flex flex-col items-center gap-2 p-6 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="text-4xl">✍️</div>
                    <div className="text-charcoal dark:text-white font-medium">Manual Register</div>
                  </button>
                  <Link
                    href={`/e/${eventSlug}/admin/score-adjust`}
                    className="flex flex-col items-center gap-2 p-6 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="text-4xl">✏️</div>
                    <div className="text-charcoal dark:text-white font-medium">Adjust Scores</div>
                  </Link>
                  <Link
                    href={`/e/${eventSlug}/admin/rounds`}
                    className="flex flex-col items-center gap-2 p-6 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="text-4xl">🔄</div>
                    <div className="text-charcoal dark:text-white font-medium">Rounds & Timers</div>
                  </Link>
                </div>
              </div>

              {/* Registration Control */}
              <div className="card p-6">
                <h2 className="font-display text-lg font-semibold text-charcoal dark:text-white mb-4">Registration Control</h2>
                <div className={`p-5 rounded-xl border transition-all ${rules?.registrationClosed
                  ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
                  : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-3xl ${rules?.registrationClosed ? 'animate-pulse' : ''}`}>
                        {rules?.registrationClosed ? '🔒' : '✅'}
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold mb-1 ${rules?.registrationClosed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                          {rules?.registrationClosed ? 'Registrations Closed' : 'Registrations Open'}
                        </h3>
                        <p className="text-sm text-charcoal/60 dark:text-slate-300">
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
                      className={`px-5 py-2.5 rounded-lg font-medium transition-all ${rules?.registrationClosed
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-rose-500 hover:bg-rose-600 text-white'
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
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-charcoal/5 dark:border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-display text-lg font-semibold text-charcoal dark:text-white">Participants</h2>
                  <button
                    onClick={() => setShowManualRegister(true)}
                    className="btn-primary px-4 py-2 rounded-lg text-sm"
                  >
                    + Add Participant
                  </button>
                </div>

                {/* Filters */}
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-charcoal/50 dark:text-slate-400">Filter by Round:</label>
                    <select
                      value={selectedRoundFilter ?? ''}
                      onChange={(e) => setSelectedRoundFilter(e.target.value ? Number(e.target.value) : null)}
                      className="input py-1 px-3 text-sm"
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
                      className="bg-[#FAF9F6] dark:bg-slate-700 border border-[#1A1A1A]/10 dark:border-slate-600 text-[#1A1A1A] dark:text-white rounded px-3 py-1 text-sm"
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
                      <thead className="bg-[#1A1A1A]/5 dark:bg-white/5 border-b border-[#1A1A1A]/5 dark:border-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-[#1A1A1A]/70 dark:text-slate-300">Rank</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-[#1A1A1A]/70 dark:text-slate-300">Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-[#1A1A1A]/70 dark:text-slate-300">Type</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-[#1A1A1A]/70 dark:text-slate-300">Score</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-[#1A1A1A]/70 dark:text-slate-300">Rounds Completed</th>
                          {filterRound && (
                            <th className="px-6 py-3 text-center text-sm font-semibold text-[#1A1A1A]/70 dark:text-slate-300">
                              Round {filterRound} Status
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1A1A]/10 dark:divide-slate-700">
                        {filtered.map((participant) => {
                          const completedRounds = roundCompletions[participant.id] || new Set<number>()
                          const isCompleted = filterRound ? completedRounds.has(filterRound) : false
                          const completedCount = completedRounds.size
                          const totalRounds = Array.isArray(rules?.rounds) ? rules.rounds.length : 0

                          return (
                            <tr key={participant.id} className={`hover:bg-[#1A1A1A]/5 dark:hover:bg-white/5 ${isCompleted ? 'bg-green-500/5' : ''}`}>
                              <td className="px-6 py-4 text-[#1A1A1A]/70 dark:text-slate-300">#{participant.rank}</td>
                              <td className="px-6 py-4 font-medium text-[#1A1A1A] dark:text-white">{participant.name}</td>
                              <td className="px-6 py-4 text-[#1A1A1A]/60 dark:text-slate-400 capitalize">{participant.kind}</td>
                              <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">{participant.totalScore}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-[#1A1A1A]/70 dark:text-slate-300 text-sm">
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
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display text-lg font-semibold text-charcoal dark:text-white">Judges</h2>
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
                  className="btn-primary px-4 py-2 rounded-lg text-sm"
                >
                  + Invite Judge
                </button>
              </div>
              <p className="text-charcoal/50 dark:text-slate-400 mb-4">Manage judges and generate invite codes for the judge console.</p>
              <div className="bg-charcoal/5 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                <p className="text-charcoal/70 dark:text-slate-300 text-sm">
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
                        <th className="px-4 py-3 text-left text-[#1A1A1A]/70 dark:text-slate-200">Name</th>
                        <th className="px-4 py-3 text-left text-[#1A1A1A]/70 dark:text-slate-200">Email</th>
                        <th className="px-4 py-3 text-left text-[#1A1A1A]/70 dark:text-slate-200">Role</th>
                        <th className="px-4 py-3 text-left text-[#1A1A1A]/70 dark:text-slate-200">Status</th>
                        <th className="px-4 py-3 text-left text-[#1A1A1A]/70 dark:text-slate-200">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/5 dark:divide-white/5">
                      {judges.map((j) => (
                        <tr key={j.id} className="hover:bg-[#1A1A1A]/5 dark:hover:bg-white/5">
                          <td className="px-4 py-3 text-[#1A1A1A] dark:text-white font-medium">{j.name || 'Unnamed'}</td>
                          <td className="px-4 py-3 text-[#1A1A1A]/70 dark:text-slate-300">{j.email || '—'}</td>
                          <td className="px-4 py-3 text-[#1A1A1A]/70 dark:text-slate-300 capitalize">{j.role || 'judge'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${j.active ? 'bg-green-500/20 text-green-300' : 'bg-[#1A1A1A]/10 dark:bg-slate-600 text-[#1A1A1A]/70 dark:text-slate-200'}`}>
                              {j.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#1A1A1A]/70 dark:text-slate-300">
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
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="font-display text-lg font-semibold text-charcoal dark:text-white mb-4">Event Settings</h2>
                <p className="text-charcoal/50 dark:text-slate-400 text-sm mb-4">
                  Configure rounds, timers, judging locks, and elimination controls.
                </p>
                <div className="space-y-4">
                  <Link
                    href={`/e/${eventSlug}/stage`}
                    className="block p-4 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="font-medium text-charcoal dark:text-white mb-1">📺 Live Display</div>
                    <div className="text-sm text-charcoal/50 dark:text-slate-400">View the public live display for this event</div>
                  </Link>
                  <Link
                    href={`/e/${eventSlug}/admin/settings`}
                    className="block p-4 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="font-medium text-charcoal dark:text-white mb-1">⚙️ Advanced Settings</div>
                    <div className="text-sm text-charcoal/50 dark:text-slate-400">Configure rounds, judging modes, and advanced features</div>
                  </Link>
                  <Link
                    href={`/e/${eventSlug}/admin/rubric`}
                    className="block p-4 bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 rounded-lg transition-colors border border-charcoal/10 dark:border-white/5"
                  >
                    <div className="font-medium text-charcoal dark:text-white mb-1">📋 Scoring Rubric</div>
                    <div className="text-sm text-charcoal/50 dark:text-slate-400">Edit scoring criteria and weights</div>
                  </Link>
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to ' + (features?.isEnded ? 'reopen' : 'end') + ' this event?')) return
                      setEndingEvent(true)
                      try {
                        const res = await fetch(`/api/events/${eventSlug}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ features: { ...features, isEnded: !features?.isEnded } })
                        })
                        if (res.ok) {
                          toast.success(features?.isEnded ? 'Event Reopened' : 'Event Ended')
                          fetchEventData()
                        } else { toast.error('Failed to update event') }
                      } catch (e) { toast.error('Connection error') } finally { setEndingEvent(false) }
                    }}
                    disabled={endingEvent}
                    className={`w-full p-4 rounded-lg transition-colors text-left border ${
                      features?.isEnded 
                        ? 'bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-600/20' 
                        : 'bg-rose-600/10 hover:bg-rose-600/20 border-rose-600/20'
                    }`}
                  >
                    <div className={`font-semibold mb-1 ${features?.isEnded ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {features?.isEnded ? '🟢 Reopen Event' : '🛑 End Event'}
                    </div>
                    <div className={`text-sm ${features?.isEnded ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                      {features?.isEnded ? 'Resume the event and hide final results' : 'Close the event and display final results'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Event Branding Section (consolidated from old Branding tab) */}
              <div className="card p-6">
                <h2 className="font-display text-lg font-semibold text-charcoal dark:text-white mb-4">Event Branding</h2>
                <p className="text-charcoal/50 dark:text-slate-400 mb-6">
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
            </div>
          )}

          {/* Broadcast Tab */}
          {activeTab === 'broadcast' && (
            <div className="space-y-6">
              <div className="card p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-charcoal/5 dark:bg-white/5 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-charcoal/60 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-charcoal dark:text-white">Broadcast Center</h2>
                    <p className="text-sm text-charcoal/50 dark:text-slate-500">Send real-time announcements to all displays</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Message Type */}
                  <div>
                    <label className="block text-xs font-medium text-charcoal/50 dark:text-slate-500 uppercase tracking-wider mb-3">Message Type</label>
                    <div className="flex gap-3">
                      {[
                        { type: 'info' as const, label: 'Info', icon: '📢', color: 'blue' },
                        { type: 'warning' as const, label: 'Warning', icon: '⚠️', color: 'amber' },
                        { type: 'urgent' as const, label: 'Urgent', icon: '🚨', color: 'rose' }
                      ].map((opt) => (
                        <button
                          key={opt.type}
                          onClick={() => setBroadcastType(opt.type)}
                          className={cn(
                            "flex-1 p-4 rounded-2xl border transition-all flex items-center justify-center gap-3",
                            broadcastType === opt.type
                              ? opt.color === 'blue' ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                                : opt.color === 'amber' ? 'bg-amber-600/20 border-amber-500/50 text-amber-400'
                                : 'bg-rose-600/20 border-rose-500/50 text-rose-400'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                          )}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <span className="text-xs font-bold uppercase tracking-widest">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest mb-3">Message</label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type your announcement message..."
                      className="w-full h-32 p-4 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-2xl text-[#1A1A1A] dark:text-white placeholder:text-[#1A1A1A]/40 dark:placeholder:text-slate-600 resize-none focus:outline-none focus:border-blue-500/50"
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-[#1A1A1A]/40 dark:text-slate-600">{broadcastMessage.length}/200 characters</span>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={sendBroadcast}
                    disabled={!broadcastMessage.trim() || broadcastSending}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                      broadcastMessage.trim()
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                        : "bg-[#1A1A1A]/5 dark:bg-white/5 text-[#1A1A1A]/40 dark:text-slate-600 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                    {broadcastSending ? 'Sending...' : 'Send Broadcast'}
                  </button>
                </div>
              </div>

              {/* Broadcast History */}
              {broadcastHistory.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-charcoal/50 dark:text-slate-500 uppercase tracking-wider mb-4">Recent Broadcasts</h3>
                  <div className="space-y-3">
                    {broadcastHistory.map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-4 rounded-xl border flex items-start gap-4",
                          item.type === 'info' ? 'bg-blue-600/10 border-blue-500/20' :
                          item.type === 'warning' ? 'bg-amber-600/10 border-amber-500/20' :
                          'bg-rose-600/10 border-rose-500/20'
                        )}
                      >
                        <span className="text-lg">
                          {item.type === 'info' ? '📢' : item.type === 'warning' ? '⚠️' : '🚨'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#1A1A1A] dark:text-white font-medium">{item.message}</p>
                          <span className="text-xs text-[#1A1A1A]/40 dark:text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF9F6] dark:bg-slate-800 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#1A1A1A] dark:text-white">Share Event</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {showLeaderboardTab && (
                <button
                  className={`px-3 py-2 rounded ${qrTab === 'leaderboard' ? 'bg-blue-600 text-white' : 'bg-[#1A1A1A]/10 dark:bg-slate-700 text-[#1A1A1A]/70 dark:text-slate-200'}`}
                  onClick={() => setQrTab('leaderboard')}
                >
                  Leaderboard
                </button>
              )}
              <button
                className={`px-3 py-2 rounded ${qrTab === 'stage' ? 'bg-blue-600 text-white' : 'bg-[#1A1A1A]/10 dark:bg-slate-700 text-[#1A1A1A]/70 dark:text-slate-200'}`}
                onClick={() => setQrTab('stage')}
              >
                Stage
              </button>
              <button
                className={`px-3 py-2 rounded ${qrTab === 'registration' ? 'bg-blue-600 text-white' : 'bg-[#1A1A1A]/10 dark:bg-slate-700 text-[#1A1A1A]/70 dark:text-slate-200'}`}
                onClick={() => setQrTab('registration')}
              >
                Registration
              </button>
              <button
                className={`px-3 py-2 rounded ${qrTab === 'judge' ? 'bg-blue-600 text-white' : 'bg-[#1A1A1A]/10 dark:bg-slate-700 text-[#1A1A1A]/70 dark:text-slate-200'}`}
                onClick={() => setQrTab('judge')}
              >
                Judge
              </button>
            </div>

            {qrTab === 'leaderboard' && (
              <div className="bg-[#1A1A1A]/5 dark:bg-slate-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-[#1A1A1A] dark:text-white mb-2">📊 Public Leaderboard</h4>
                <p className="text-sm text-[#1A1A1A]/60 dark:text-slate-400 mb-4">Scan this QR to view the live leaderboard.</p>
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={publicURL} size={180} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-[#1A1A1A]/60 dark:text-slate-400 mb-2">URL</div>
                    <div className="flex gap-2">
                      <input type="text" value={publicURL} readOnly className="flex-1 px-3 py-2 bg-[#FAF9F6] dark:bg-slate-600 border border-[#1A1A1A]/10 dark:border-slate-500 rounded text-[#1A1A1A] dark:text-white text-sm" />
                      <button onClick={() => copyToClipboard(publicURL, 'Leaderboard URL')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Copy</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {qrTab === 'stage' && (
              <div className="bg-[#1A1A1A]/5 dark:bg-slate-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-[#1A1A1A] dark:text-white mb-2">📺 Stage Display</h4>
                <p className="text-sm text-[#1A1A1A]/60 dark:text-slate-400 mb-4">Use this on the projector or stage display device.</p>
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={`${publicURL}/stage`} size={180} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-[#1A1A1A]/60 dark:text-slate-400 mb-2">URL</div>
                    <div className="flex gap-2">
                      <input type="text" value={`${publicURL}/stage`} readOnly className="flex-1 px-3 py-2 bg-[#FAF9F6] dark:bg-slate-600 border border-[#1A1A1A]/10 dark:border-slate-500 rounded text-[#1A1A1A] dark:text-white text-sm" />
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
              <div className="bg-[#1A1A1A]/5 dark:bg-slate-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-[#1A1A1A] dark:text-white mb-2">⚖️ Invite Judge</h4>
                <p className="text-sm text-[#1A1A1A]/60 dark:text-slate-400 mb-4">Share this link with judges.</p>
                {judgeInvite ? (
                  <div className="flex items-center gap-6">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG value={judgeInvite.inviteUrl} size={180} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-[#1A1A1A]/60 dark:text-slate-400 mb-2">Invite Link</div>
                      <div className="flex gap-2">
                        <input type="text" value={judgeInvite.inviteUrl} readOnly className="flex-1 px-3 py-2 bg-[#FAF9F6] dark:bg-slate-600 border border-[#1A1A1A]/10 dark:border-slate-500 rounded text-[#1A1A1A] dark:text-white text-sm" />
                        <button onClick={() => copyToClipboard(judgeInvite.inviteUrl, 'Judge Invite')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Copy</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[#1A1A1A]/60 dark:text-slate-400">No judge invite generated yet. Use the "Invite Judge" button to create one.</div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowQR(false)}
              className="w-full mt-6 px-4 py-3 bg-[#1A1A1A]/10 dark:bg-slate-600 hover:bg-[#1A1A1A]/20 dark:hover:bg-slate-500 text-[#1A1A1A] dark:text-white rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Manual Register Modal */}
      {showManualRegister && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#1A1A1A] dark:text-white">Manual Register</h3>
              <button onClick={() => setShowManualRegister(false)} className="text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white text-2xl leading-none">&times;</button>
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
                <label className="block text-sm text-[#1A1A1A]/70 dark:text-slate-300 mb-1">Name</label>
                <input name="name" className="w-full px-3 py-2 rounded bg-[#FAF9F6] dark:bg-slate-700 border border-[#1A1A1A]/20 dark:border-slate-600 text-[#1A1A1A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-[#1A1A1A]/70 dark:text-slate-300 mb-1">Type</label>
                <select name="kind" defaultValue="team" className="w-full px-3 py-2 rounded bg-[#FAF9F6] dark:bg-slate-700 border border-[#1A1A1A]/20 dark:border-slate-600 text-[#1A1A1A] dark:text-white">
                  <option value="team">Team</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[#1A1A1A] dark:bg-blue-600 text-white rounded hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-700 transition-colors">Add</button>
                <button type="button" onClick={() => setShowManualRegister(false)} className="px-4 py-2 bg-[#1A1A1A]/10 dark:bg-slate-600 text-[#1A1A1A] dark:text-white rounded hover:bg-[#1A1A1A]/20 dark:hover:bg-slate-500 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
