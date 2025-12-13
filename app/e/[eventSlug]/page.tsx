'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { EventNavigation } from '@/components/event-navigation'
import { EventCache } from '@/lib/cache'
import { useTheme } from '@/lib/theme'

interface Participant {
  id: string
  name: string
  kind: string
  totalScore: number
  rank: number
  previousRank?: number
  momentum?: number
}

interface Event {
  id: string
  name: string
  slug: string
  organization: {
    name: string
  }
}

export default function EventLeaderboardPage() {
  const params = useParams()
  const eventSlug = params.eventSlug as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [searchQuery, setSearchQuery] = useState('')

  const cache = EventCache.getInstance()
  const { setEventColors } = useTheme()

  useEffect(() => {
    fetchLeaderboard()
    const cleanupSse = setupSSE()
    return () => {
      if (typeof cleanupSse === 'function') cleanupSse()
      setEventColors(null)
    }
  }, [eventSlug, setEventColors])

  const fetchLeaderboard = async () => {
    // Try cache first
    const cacheKey = `leaderboard_${eventSlug}`
    const cached = cache.get(cacheKey)
    
    if (cached) {
      setEvent(cached.event)
      setParticipants(cached.participants)
      setLoading(false)
    }

    try {
      const response = await fetch(`/api/events/${eventSlug}/leaderboard`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
        setParticipants(data.participants)
        cache.set(cacheKey, data, 2 * 60 * 1000) // Cache for 2 minutes
        if (data.event?.brandColors) {
          setEventColors(data.event.brandColors)
        } else {
          setEventColors(null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupSSE = () => {
    const eventSource = new EventSource(`/api/sse?eventSlug=${eventSlug}`)
    
    eventSource.onopen = () => setConnected(true)
    eventSource.onerror = () => setConnected(false)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'leaderboard-update') {
        setParticipants(data.participants)
      }
    }

    return () => eventSource.close()
  }

  // Filter and paginate participants
  const filteredParticipants = useMemo(() => {
    if (!searchQuery) return participants
    return participants.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [participants, searchQuery])

  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredParticipants.slice(startIndex, startIndex + pageSize)
  }, [filteredParticipants, currentPage, pageSize])

  const totalPages = Math.ceil(filteredParticipants.length / pageSize)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, pageSize])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
          <p className="text-slate-400 mb-6">The event you're looking for doesn't exist.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const getRankChange = (participant: Participant) => {
    if (!participant.previousRank || participant.previousRank === participant.rank) {
      return <span className="text-slate-500">━</span>
    }
    if (participant.rank < participant.previousRank) {
      return <span className="text-green-400">↑ {participant.previousRank - participant.rank}</span>
    }
    return <span className="text-red-400">↓ {participant.rank - participant.previousRank}</span>
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <EventNavigation />
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{event.name}</h1>
              <p className="text-slate-400">{event.organization.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                <span className="text-sm font-medium">{connected ? 'Live' : 'Disconnected'}</span>
              </div>
              <Link
                href={`/e/${eventSlug}/stage`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                style={{ minHeight: '40px' }}
              >
                📺 Stage Display
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Leaderboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {participants.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Participants Yet</h2>
            <p className="text-slate-400">Participants will appear here once they register and receive scores.</p>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search participants..."
                  className="flex-1 min-w-0 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400 whitespace-nowrap">Per page:</label>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="text-sm text-slate-400">
                Showing {paginatedParticipants.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, filteredParticipants.length)} of {filteredParticipants.length} {searchQuery ? 'filtered' : 'total'}
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Rank</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Participant</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Type</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Score</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">Change</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {paginatedParticipants.map((participant, index) => {
                      const globalIndex = (currentPage - 1) * pageSize + index
                      return (
                        <tr
                          key={participant.id}
                          className="hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {globalIndex < 3 ? (
                                <span className="text-2xl">
                                  {globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : '🥉'}
                                </span>
                              ) : (
                                <span className="text-lg font-bold text-slate-400">
                                  #{participant.rank}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{participant.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-400 capitalize">{participant.kind}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-lg font-bold text-blue-400">
                              {participant.totalScore}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium">
                            {getRankChange(participant)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((participant.totalScore / 1000) * 100, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⏮️ First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⏪ Prev
                </button>
                <div className="flex items-center gap-2">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ⏩
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last ⏭️
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
