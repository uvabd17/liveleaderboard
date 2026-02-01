'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { EventCreationWizard } from '@/components/event-creation-wizard'
import { BrandingUpload } from '@/components/branding-upload'
import { PageLoading } from '@/components/loading-spinner'
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
  Command,
  Layout,
  Layers,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'

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
      // Set admin role when authenticated user accesses dashboard
      if (typeof window !== 'undefined') {
        localStorage.setItem('user-role', 'admin')
      }
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
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">

      {/* Aurora Ambience */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] bg-center" />
      </div>

      {/* Naval Navigation */}
      <nav className="sticky top-0 z-50 bg-[#020617]/60 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <Command className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="font-black text-xl italic uppercase tracking-tighter text-white block leading-none">Dashboard</span>
                <span className="text-[10px] font-black font-mono text-slate-600 uppercase tracking-widest">Event Management // Active</span>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

            <div className="hidden lg:flex items-center gap-4">
              {stats && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black font-mono text-slate-400 uppercase">{stats.activeEvents} ACTIVE EVENTS</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-black text-white uppercase italic">{session.user?.name || 'Administrator'}</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase">{session.user?.email}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all"
              title="Terminate Session"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 space-y-12 animate-fade-in">

        {/* STATS HUD */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Events', value: stats?.totalEvents || 0, icon: <Layers className="w-5 h-5 text-blue-400" />, color: 'blue' },
            { label: 'Active Now', value: stats?.activeEvents || 0, icon: <Activity className="w-5 h-5 text-orange-400" />, color: 'orange' },
            { label: 'Participants', value: stats?.totalParticipants || 0, icon: <Users className="w-5 h-5 text-indigo-400" />, color: 'indigo' },
            { label: 'Judges', value: stats?.totalJudges || 0, icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />, color: 'emerald' },
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-8 rounded-[2rem] border-white/10 group transition-all hover:border-white/20">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black font-mono text-slate-500 tracking-widest uppercase">{stat.label}</p>
                  <p className="text-4xl font-black text-white italic tracking-tighter transition-all group-hover:scale-105 origin-left">
                    {stat.value}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 transition-colors group-hover:border-white/20">
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </section>

{/* Manual Access Section Removed */}


        <div className="grid lg:grid-cols-12 gap-12">

          {/* CAMPAIGN LIST */}
          <section className="lg:col-span-8 space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2">
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Event Standings</h2>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Select an operation to begin management</p>
              </div>

              <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
                {(['active', 'archived', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === tab
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEvents.length === 0 ? (
                <div className="col-span-full py-20 glass-panel rounded-[3rem] border-white/5 border-dashed border-2 flex flex-col items-center justify-center opacity-60">
                  <div className="text-4xl mb-6 grayscale">📂</div>
                  <h3 className="text-xl font-black text-white/40 uppercase italic tracking-widest">No Campaigns Found</h3>
                  <p className="text-slate-600 font-mono text-xs mt-2 uppercase">Awaiting creation of first event module</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-8 px-8 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest transition-all"
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const eventColor = event.brandColors?.primary || '#3b82f6'
                  return (
                    <div key={event.id} className="relative group overflow-hidden glass-panel rounded-[2.5rem] p-8 border-white/10 transition-all hover:border-white/20 active:scale-[0.98]">
                      {/* Aura */}
                      <div
                        className="absolute -inset-10 opacity-0 group-hover:opacity-10 blur-[60px] transition-all duration-1000 pointer-events-none"
                        style={{ backgroundColor: eventColor }}
                      />

                      <div className="relative z-10 space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {event.archived && (
                                <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-[8px] font-black text-rose-500 uppercase tracking-widest rounded">ARCHIVED</span>
                              )}
                              <span className="text-[10px] font-mono text-slate-500 uppercase">/{event.slug}</span>
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter truncate leading-tight group-hover:text-blue-400 transition-colors">
                              {event.name}
                            </h3>
                          </div>
                          <Link
                            href={`/e/${event.slug}`}
                            className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors text-slate-500 hover:text-white"
                            title="Public Live View"
                          >
                            <ArrowRight className="w-4 h-4 -rotate-45" />
                          </Link>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black font-mono text-slate-600 uppercase">Participants</span>
                            <span className="text-lg font-black text-white font-mono">{event._count.participants}</span>
                          </div>
                          <div className="w-[1px] h-6 bg-white/5" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black font-mono text-slate-600 uppercase">Evaluators</span>
                            <span className="text-lg font-black text-white font-mono">{event._count.judges}</span>
                          </div>
                        </div>

                        <Link
                          href={`/e/${event.slug}/admin`}
                          className="w-full py-5 bg-white/5 hover:bg-blue-600 text-slate-400 hover:text-white border border-white/5 flex items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all italic group/btn shadow-xl hover:shadow-blue-500/20"
                        >
                          Manage Event <ChevronRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* CTA BUTTON */}
            <div className="pt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full glass-panel border-dashed border-white/10 rounded-[2.5rem] py-10 flex flex-col items-center justify-center gap-3 group hover:border-blue-500/30 transition-all hover:bg-blue-600/5"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-black text-white uppercase italic tracking-widest mt-2">Initialize New Event Module</span>
              </button>
            </div>
          </section>

          {/* SIDEBAR: DECK SETTINGS */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 bg-gradient-to-br from-blue-900/10 to-transparent">
              <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-xs font-black font-mono text-slate-500 tracking-[0.3em] uppercase italic">Identity Themes</h3>
                <Settings className="w-4 h-4 text-slate-600" />
              </div>

              <div className="space-y-6">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Define the global visual signature for all campaigns linked to this organization account.
                </p>

                <div className="relative group">
                  <div className="absolute -inset-4 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <BrandingUpload
                      currentLogo={orgBranding?.logoUrl || null}
                      currentColors={orgBranding?.brandColors || null}
                      onUpload={handleOrgBrandingUpload}
                      onRemove={handleOrgBrandingRemove}
                      label="Global Identity"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-black font-mono text-slate-500 tracking-[0.2em] uppercase italic">Management Tips</h3>
              </div>

              <ul className="space-y-4">
                {[
                  "Deploy 'Kiosk Mode' for tactical theater displays.",
                  "Verify evaluator credentials via Hashed Security.",
                  "Export campaign results into standardized CSV arrays.",
                  "Custom branding overrides global deck aesthetics."
                ].map((tip, i) => (
                  <li key={i} className="flex gap-4 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0 animate-pulse" />
                    <span className="text-xs text-slate-500 font-medium group-hover:text-slate-300 transition-colors uppercase leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 text-center opacity-40">
              <div className="text-[10px] font-black font-mono text-slate-600 uppercase tracking-[0.5em] mb-2 leading-none">Security Status</div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-500 font-black uppercase">ENCRYPTED // v7.2.0</span>
              </div>
            </div>
          </aside>

        </div>
      </main>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#020617] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden shadow-blue-500/10">
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
