'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { EventCreationWizard } from '@/components/event-creation-wizard'
import { BrandingUpload } from '@/components/branding-upload'
import { PageLoading } from '@/components/loading-spinner'
import { Logo } from '@/components/brand/logo'
import {
  BarChart,
  Calendar,
  Users,
  Activity,
  Plus,
  Settings,
  ArrowRight,
  LogOut,
  Sparkles,
  Command,
  Layout,
  Layers,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

interface Event {
  id: string
  name: string
  slug: string
  startAt: string | null
  endAt: string | null
  visibility: string
  archived: boolean
  brandColors?: {
    primary: string
    secondary: string
    accent: string
  }
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
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [orgBranding, setOrgBranding] = useState<{ logoUrl?: string; brandColors?: { primary: string; secondary: string; accent: string } } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      // Redirect to onboarding if not completed
      if (!session?.user?.onboardingComplete) {
        router.push('/onboarding')
        return
      }
      // Set admin role when authenticated user accesses dashboard
      if (typeof window !== 'undefined') {
        localStorage.setItem('user-role', 'admin')
      }
    }
  }, [status, session, router])

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
      toast.success('Dashboard Theme Applied')
    }
  }

  const handleOrgBrandingRemove = async () => {
    const response = await fetch('/api/organization/logo', {
      method: 'DELETE',
    })
    if (response.ok) {
      setOrgBranding(null)
      toast.success('Theme Reset to Default')
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filter === 'all') return true
      if (filter === 'active') return !event.archived
      if (filter === 'archived') return event.archived
      return true
    })
  }, [events, filter])

  if (status === 'loading' || loading) {
    return <PageLoading message="Dashboard" submessage="Loading your events and organization data..." />
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-950 text-charcoal dark:text-cream">

      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-charcoal/5 dark:bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-charcoal/5 dark:bg-white/5 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-cream/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-charcoal/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Logo className="w-5 h-5" />
              <div>
                <span className="font-display text-lg font-semibold text-charcoal dark:text-cream block leading-none">Dashboard</span>
                <span className="text-xs text-charcoal/40 dark:text-cream/40">Event Management</span>
              </div>
            </div>

            <div className="h-4 w-px bg-charcoal/10 dark:bg-white/10 hidden sm:block" />

            <div className="hidden lg:flex items-center gap-2">
              {stats && (
                <div className="flex items-center gap-2 px-3 py-1 bg-charcoal/5 dark:bg-white/5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-charcoal/60 dark:text-cream/60">{stats.activeEvents} Active Events</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-charcoal/60 dark:text-cream/60 hover:text-charcoal dark:hover:text-cream hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-charcoal dark:text-cream">{session.user?.name || 'Administrator'}</span>
              <span className="text-xs text-charcoal/40 dark:text-cream/40">{session.user?.email}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="p-2 text-charcoal/40 dark:text-cream/40 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12 animate-fade-in">

        {/* STATS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats?.totalEvents || 0, icon: <Layers className="w-5 h-5" /> },
            { label: 'Active Now', value: stats?.activeEvents || 0, icon: <Activity className="w-5 h-5" /> },
            { label: 'Participants', value: stats?.totalParticipants || 0, icon: <Users className="w-5 h-5" /> },
            { label: 'Judges', value: stats?.totalJudges || 0, icon: <ShieldCheck className="w-5 h-5" /> },
          ].map((stat, i) => (
            <div key={i} className="card p-6 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-charcoal/40 dark:text-cream/40 mb-1">{stat.label}</p>
                  <p className="text-3xl font-mono font-bold text-charcoal dark:text-cream">
                    {stat.value}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-charcoal/5 dark:bg-white/5 text-charcoal/40 dark:text-cream/40">
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </section>

{/* Manual Access Section Removed */}


        <div className="grid lg:grid-cols-12 gap-12">

          {/* EVENTS LIST */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-charcoal dark:text-cream">Your Events</h2>
                <p className="text-sm text-charcoal/50 dark:text-cream/50">Select an event to manage</p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-charcoal/5 dark:bg-white/5 rounded-full">
                {(['active', 'archived', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all capitalize ${filter === tab
                      ? 'bg-charcoal dark:bg-cream text-cream dark:text-charcoal'
                      : 'text-charcoal/50 dark:text-cream/50 hover:text-charcoal dark:hover:text-cream'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.length === 0 ? (
                <div className="col-span-full py-16 card border-dashed flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-charcoal/5 dark:bg-white/5 flex items-center justify-center mb-4">
                    <Layers className="w-6 h-6 text-charcoal/30 dark:text-cream/30" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-charcoal/60 dark:text-cream/60 mb-1">No Events Found</h3>
                  <p className="text-charcoal/40 dark:text-cream/40 text-sm mb-6">Create your first event to get started</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary px-6 py-2.5 rounded-full text-sm"
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const eventColor = event.brandColors?.primary || '#1a1a1a'
                  return (
                    <div key={event.id} className="card p-6 group hover:shadow-lg transition-all">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {event.archived && (
                                <span className="badge-minimal bg-rose-50 text-rose-600">Archived</span>
                              )}
                              <span className="text-xs text-charcoal/40 dark:text-cream/40">/{event.slug}</span>
                            </div>
                            <h3 className="font-display text-xl font-semibold text-charcoal dark:text-cream truncate leading-tight group-hover:text-charcoal/80 dark:group-hover:text-cream/80 transition-colors">
                              {event.name}
                            </h3>
                          </div>
                          <Link
                            href={`/e/${event.slug}`}
                            className="p-2 rounded-lg bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 transition-colors text-charcoal/40 dark:text-cream/40 hover:text-charcoal dark:hover:text-cream"
                            title="View Live"
                          >
                            <ArrowRight className="w-4 h-4 -rotate-45" />
                          </Link>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex flex-col">
                            <span className="text-xs text-charcoal/40 dark:text-cream/40">Participants</span>
                            <span className="text-lg font-mono font-bold text-charcoal dark:text-cream">{event._count.participants}</span>
                          </div>
                          <div className="w-px h-8 bg-charcoal/10 dark:bg-white/10" />
                          <div className="flex flex-col">
                            <span className="text-xs text-charcoal/40 dark:text-cream/40">Judges</span>
                            <span className="text-lg font-mono font-bold text-charcoal dark:text-cream">{event._count.judges}</span>
                          </div>
                        </div>

                        <Link
                          href={`/e/${event.slug}/admin`}
                          className="w-full py-3 bg-charcoal dark:bg-cream text-cream dark:text-charcoal hover:bg-charcoal/90 dark:hover:bg-cream/90 flex items-center justify-center rounded-xl text-sm font-medium transition-all group/btn"
                        >
                          Manage Event <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* CREATE BUTTON */}
            <div className="pt-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full card border-dashed py-8 flex flex-col items-center justify-center gap-3 group hover:border-charcoal/20 dark:hover:border-white/20 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-charcoal dark:bg-cream text-cream dark:text-charcoal flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-charcoal/60 dark:text-cream/60 group-hover:text-charcoal dark:group-hover:text-cream transition-colors">Create New Event</span>
              </button>
            </div>
          </section>

          {/* SIDEBAR */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-charcoal dark:text-cream">Organization Branding</h3>
                <Settings className="w-4 h-4 text-charcoal/30 dark:text-cream/30" />
              </div>

              <div className="space-y-4">
                <p className="text-xs text-charcoal/50 dark:text-cream/50 leading-relaxed">
                  Set global branding for all events under your organization.
                </p>

                <BrandingUpload
                  currentLogo={orgBranding?.logoUrl || null}
                  currentColors={orgBranding?.brandColors || null}
                  onUpload={handleOrgBrandingUpload}
                  onRemove={handleOrgBrandingRemove}
                  label="Organization Logo"
                />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-medium text-charcoal dark:text-cream">Quick Tips</h3>
              </div>

              <ul className="space-y-3">
                {[
                  "Use Kiosk Mode for public displays",
                  "Share judge credentials securely via email",
                  "Export results to CSV for reporting",
                  "Event branding overrides organization defaults"
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-1 h-1 rounded-full bg-charcoal/30 dark:bg-cream/30 mt-2 shrink-0" />
                    <span className="text-xs text-charcoal/50 dark:text-cream/50 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center py-4">
              <div className="text-xs text-charcoal/30 dark:text-cream/30">Live Leaderboard v1.0</div>
            </div>
          </aside>

        </div>
      </main>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-charcoal/60 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-cream dark:bg-gray-900 border border-charcoal/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
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

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}
