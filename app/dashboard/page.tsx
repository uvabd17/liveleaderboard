'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EventCreationWizard } from '@/components/event-creation-wizard'
import { BrandingUpload } from '@/components/branding-upload'
import {
  BarChart,
  Calendar,
  Users,
  Trophy,
  Activity,
  Plus,
  Settings,
  ArrowRight,
  LogOut,
  Sparkles,
  Search,
  Grid,
  List,
  Filter
} from 'lucide-react'

interface Event {
  id: string
  name: string
  slug: string
  startAt: string | null
  endAt: string | null
  visibility: string
  archived: boolean
  _count: {
    participants: number
    judges: number
  }
}

interface DashboardStats {
  totalEvents: number
  activeEvents: number
  totalParticipants: number
  totalJudges: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [orgBranding, setOrgBranding] = useState<{ logoUrl?: string; brandColors?: { primary: string; secondary: string; accent: string } } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
      fetchOrgBranding()
    }
  }, [status])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrgBranding = async () => {
    try {
      const response = await fetch('/api/organization/logo')
      if (response.ok) {
        const data = await response.json()
        setOrgBranding(data.brandingTheme || null)
      }
    } catch (error) {
      console.error('Failed to fetch organization branding:', error)
    }
  }

  const handleOrgBrandingUpload = async (logoData: string | null, colors: { primary: string; secondary: string; accent: string } | null) => {
    const response = await fetch('/api/organization/logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoData, brandColors: colors }),
    })
    if (response.ok) {
      const data = await response.json()
      setOrgBranding(data.brandingTheme)
    } else {
      throw new Error('Upload failed')
    }
  }

  const handleOrgBrandingRemove = async () => {
    const response = await fetch('/api/organization/logo', {
      method: 'DELETE',
    })
    if (response.ok) {
      setOrgBranding(null)
    } else {
      throw new Error('Remove failed')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-slate-400 font-medium">Loading Dashboard...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    if (filter === 'active') return !event.archived
    if (filter === 'archived') return event.archived
    return true
  })

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200">

      {/* Top Navigation Bar */}
      <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Trophy className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              Live Leaderboard
            </span>
            <span className="mx-2 text-slate-700">/</span>
            <span className="text-sm font-medium text-slate-400 px-2 py-1 rounded-full bg-white/5 border border-white/5">
              {orgBranding ? 'Custom Branded' : 'Pro Organization'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-slate-200">{session.user?.name || 'Organizer'}</span>
              <span className="text-xs text-slate-500">{session.user?.email}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Manage your competitions and view real-time analytics.</p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="glass-button glass-button-primary flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" /> Create New Event
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up delay-100">
          {[
            { label: 'Total Events', value: stats?.totalEvents || 0, icon: <Calendar className="w-5 h-5 text-blue-400" />, color: 'blue' },
            { label: 'Active Now', value: stats?.activeEvents || 0, icon: <Activity className="w-5 h-5 text-emerald-400" />, color: 'emerald' },
            { label: 'Participants', value: stats?.totalParticipants || 0, icon: <Users className="w-5 h-5 text-purple-400" />, color: 'purple' },
            { label: 'Judges', value: stats?.totalJudges || 0, icon: <Trophy className="w-5 h-5 text-amber-400" />, color: 'amber' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-6 flex items-start justify-between group">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold text-${stat.color}-400 group-hover:scale-105 transition-transform origin-left`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-3 gap-8 animate-fade-in-up delay-200">

          {/* Left Column: Events List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                My Events <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{filteredEvents.length}</span>
              </h2>

              <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                {(['active', 'archived', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === tab
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredEvents.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-2 border-slate-800">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No events found</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                    {filter === 'active' ? "You don't have any active events running right now." : "Get started by creating your first competition."}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-blue-400 hover:text-blue-300 font-medium text-sm inline-flex items-center gap-1"
                  >
                    Create Event <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div key={event.id} className="glass-card p-5 group hover:border-blue-500/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {event.name}
                          </h3>
                          {event.archived && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-400 rounded border border-slate-700">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="font-mono text-xs bg-slate-900/50 px-2 py-0.5 rounded border border-white/5">/e/{event.slug}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event._count.participants}</span>
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {event._count.judges}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/e/${event.slug}/admin`}
                          className="px-4 py-2 bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 text-slate-300 rounded-lg text-sm font-medium transition-all"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/e/${event.slug}`}
                          className="p-2 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-all"
                          title="View Public Page"
                        >
                          <ArrowRight className="w-4 h-4 -rotate-45" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Organization Settings */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                Organization Branding
              </h3>

              <p className="text-sm text-slate-400 mb-6">
                Customize the default look for all your events. Upload a logo and set brand colors.
              </p>

              <BrandingUpload
                currentLogo={orgBranding?.logoUrl || null}
                currentColors={orgBranding?.brandColors || null}
                onUpload={handleOrgBrandingUpload}
                onRemove={handleOrgBrandingRemove}
                label="Global Logo"
              />
            </div>

            <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-slate-900/50 border-blue-500/10">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Pro Tips
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  Enable "Kiosk Mode" for unattended display screens.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  Use the "Speed Check" feature to prevent spam submissions.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  Invite judges via email for secure access.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <EventCreationWizard
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                fetchDashboardData()
                setShowCreateModal(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
