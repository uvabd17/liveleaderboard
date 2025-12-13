'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EventCreationWizard } from '@/components/event-creation-wizard'
import { BrandingUpload } from '@/components/branding-upload'

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
  const [showBranding, setShowBranding] = useState(false)

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    if (filter === 'active') return !event.archived
    if (filter === 'archived') return event.archived
    return true
  })

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Live Leaderboard</h1>
              <p className="text-slate-400 text-sm">{session.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Total Events</div>
            <div className="text-3xl font-bold text-white">{stats?.totalEvents || 0}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Active Events</div>
            <div className="text-3xl font-bold text-green-400">{stats?.activeEvents || 0}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Total Participants</div>
            <div className="text-3xl font-bold text-blue-400">{stats?.totalParticipants || 0}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Total Judges</div>
            <div className="text-3xl font-bold text-purple-400">{stats?.totalJudges || 0}</div>
          </div>
        </div>

        {/* Organization Branding Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Organization Branding</h2>
            <button
              onClick={() => setShowBranding(!showBranding)}
              className="text-slate-400 hover:text-white text-sm"
            >
              {showBranding ? 'Hide' : 'Show'}
            </button>
          </div>
          {showBranding && (
            <div className="pt-4 border-t border-slate-700">
              <BrandingUpload
                currentLogo={orgBranding?.logoUrl || null}
                currentColors={orgBranding?.brandColors || null}
                onUpload={handleOrgBrandingUpload}
                onRemove={handleOrgBrandingRemove}
                label="Organization Logo"
              />
              <p className="text-sm text-slate-400 mt-4">
                Organization branding will be used as a fallback for events that don't have their own branding.
              </p>
            </div>
          )}
        </div>

        {/* Events Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Events</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ minHeight: '48px', minWidth: '48px' }}
              aria-label="Create new event"
            >
              ➕ Create Event
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-700">
            {(['active', 'archived', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === tab
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
                aria-label={`Filter ${tab} events`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-slate-400 mb-4">
                {filter === 'archived' ? 'No archived events' : 'No events yet'}
              </p>
              {filter !== 'archived' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  style={{ minHeight: '48px' }}
                  aria-label="Create your first event"
                >
                  Create Your First Event
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-slate-700 rounded-lg p-5 border border-slate-600 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate mb-1">
                        {event.name}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono">
                        /e/{event.slug}
                      </div>
                    </div>
                    {event.archived && (
                      <span className="ml-2 px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded flex-shrink-0">
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">👥</span>
                      <span className="text-white font-medium">{event._count.participants}</span>
                      <span className="text-slate-400">participants</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">⚖️</span>
                      <span className="text-white font-medium">{event._count.judges}</span>
                      <span className="text-slate-400">judges</span>
                    </div>
                  </div>

                  {event.startAt && (
                    <div className="text-xs text-slate-400 mb-4">
                      {new Date(event.startAt).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/e/${event.slug}/admin`}
                      className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ minHeight: '40px' }}
                      aria-label={`Manage ${event.name}`}
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/e/${event.slug}`}
                      className="flex-1 text-center bg-slate-600 hover:bg-slate-500 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ minHeight: '40px' }}
                      aria-label={`View ${event.name} leaderboard`}
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Event Wizard */}
      {showCreateModal && (
        <EventCreationWizard
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  )
}
