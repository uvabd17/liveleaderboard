'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme'
import { BroadcastTicker } from '@/components/broadcast-ticker'
import { QRCodeSVG } from 'qrcode.react'
import { PageLoading } from '@/components/loading-spinner'

interface Participant {
  id: string
  name: string
  kind: string
  totalScore: number
  rank: number
}

interface Round {
  id: string
  name: string
  description?: string
  timerStartedAt?: string
  timerRunning?: boolean
  duration?: number
  roundDurationMinutes?: number
}

interface Event {
  name: string
  organization: {
    name: string
  }
  logoUrl?: string | null
  brandColors?: { primary: string; secondary: string; accent: string } | null
}

type ViewState = 'welcome' | 'leaderboard' | 'up-next'

export default function KioskDisplayPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { role } = useAuth()
  const eventSlug = params.eventSlug as string
  const { setEventColors } = useTheme()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0)
  
  const [view, setView] = useState<ViewState>('welcome')
  const [slideIndex, setSlideIndex] = useState(0)
  const [qrUrl, setQrUrl] = useState('')
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Access control: Only admins can access Kiosk Display
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated' || (status === 'authenticated' && role !== 'admin')) {
      router.replace(`/e/${eventSlug}`)
    }
  }, [status, role, eventSlug, router])

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setQrUrl(`${window.location.origin}/e/${eventSlug}`)
    }
  }, [eventSlug])

  // Cycle views every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setView(current => {
        if (current === 'welcome') return 'leaderboard'
        if (current === 'leaderboard') return 'up-next'
        return 'welcome'
      })
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchData()
    // Poll for updates every 30s
    const poll = setInterval(fetchData, 30000)
    return () => clearInterval(poll)
  }, [eventSlug])

  const fetchData = async () => {
    try {
      const [lbRes, roundsRes] = await Promise.all([
        fetch(`/api/events/${eventSlug}/leaderboard?size=10`),
        fetch(`/api/rounds?eventSlug=${eventSlug}`)
      ])

      if (lbRes.ok) {
        const data = await lbRes.json()
        setEvent(data.event)
        setParticipants(data.participants || [])
        if (data.event?.brandColors) {
          setEventColors(data.event.brandColors)
        }
      }

      if (roundsRes.ok) {
        const data = await roundsRes.json()
        setRounds(data.rounds || [])
        setCurrentRoundIdx(data.currentRound || 0)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Show loading while checking auth
  if (status === 'loading') {
    return <PageLoading message="Verifying Access..." />
  }

  // Block non-admins
  if (status === 'authenticated' && role !== 'admin') {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 p-12 rounded-2xl text-center space-y-6 max-w-md">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-white">Admin Access Required</h2>
          <p className="text-white/80">The Kiosk Display is only accessible to event administrators.</p>
          <button onClick={() => router.push(`/e/${eventSlug}`)} className="w-full py-3 bg-cream text-charcoal rounded-full font-medium hover:bg-white transition-colors">Return to Event</button>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <PageLoading message="Redirecting..." />
  }

  if (!event) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Kiosk...</div>

  const currentRound = rounds[currentRoundIdx]
  const nextRound = rounds[currentRoundIdx + 1]

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative font-sans">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-20 animate-pulse-slow"
          style={{ backgroundColor: event.brandColors?.primary || '#4f46e5' }}
        />
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-20 animate-pulse-slow"
          style={{ backgroundColor: event.brandColors?.secondary || '#8b5cf6', animationDelay: '2s' }}
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
      </div>

      <BroadcastTicker />

      <div className="relative z-10 h-screen flex flex-col p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            {event.logoUrl && (
              <img src={event.logoUrl} alt="Logo" className="w-24 h-24 object-contain bg-white/5 rounded-2xl p-2 backdrop-blur-sm border border-white/10" />
            )}
            <div>
              <h1 className="text-4xl font-black tracking-tight">{event.name}</h1>
              <p className="text-xl text-slate-400 uppercase tracking-widest">{event.organization.name}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-1">Current Time</div>
            <div className="text-3xl font-bold font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center">
          
          {/* VIEW: WELCOME / BRAND */}
          {view === 'welcome' && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="inline-block p-8 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
                {event.logoUrl ? (
                  <img src={event.logoUrl} alt="Logo" className="w-64 h-64 object-contain" />
                ) : (
                  <div className="text-9xl">🏆</div>
                )}
              </div>
              <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Welcome
              </h2>
              <p className="text-3xl text-slate-400 font-light max-w-2xl mx-auto">
                Follow the live results at <span className="text-blue-400 font-bold">liveleaderboard.com/e/{params.eventSlug}</span>
              </p>
              
              {/* QR Code Placeholder - In real app, generate QR here */}
              <div className="mt-12 p-6 bg-white rounded-2xl inline-block shadow-2xl">
                 {qrUrl && (
                   <QRCodeSVG 
                      value={qrUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                   />
                 )}
                 <div className="mt-2 text-slate-900 font-bold text-sm tracking-widest uppercase">Scan to Join</div>
              </div>
            </div>
          )}

          {/* VIEW: LEADERBOARD */}
          {view === 'leaderboard' && (
            <div className="w-full max-w-6xl animate-fade-in">
              <h2 className="text-4xl font-bold mb-8 flex items-center gap-4">
                <span className="text-yellow-400">🏆</span> Top Standings
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {participants.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-6">
                      <div className={`
                        w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black
                        ${i === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 
                          i === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' :
                          i === 2 ? 'bg-orange-500/20 text-orange-500 border border-orange-500/50' :
                          'bg-slate-800 text-slate-500'}
                      `}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{p.name}</div>
                        <div className="text-sm text-slate-400 uppercase tracking-wider font-bold">{p.kind}</div>
                      </div>
                    </div>
                    <div className="text-5xl font-black font-mono tracking-tighter">
                      {p.totalScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: UP NEXT */}
          {view === 'up-next' && (
            <div className="w-full max-w-5xl animate-fade-in text-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Current Round */}
                <div className="bg-blue-600/10 border border-blue-500/30 p-10 rounded-3xl backdrop-blur-xl">
                  <div className="text-blue-400 font-mono uppercase tracking-widest mb-4">In Progress</div>
                  <div className="text-5xl font-black mb-4">{currentRound?.name || 'Event Started'}</div>
                  <div className="text-xl text-slate-300">{currentRound?.description || 'Check the main stage for details.'}</div>
                  {currentRound?.timerRunning && (
                    <div className="mt-8 inline-block px-6 py-2 bg-blue-500 text-white rounded-full font-mono font-bold animate-pulse">
                      LIVE NOW
                    </div>
                  )}
                </div>

                {/* Next Round */}
                <div className="bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-xl opacity-60">
                  <div className="text-slate-500 font-mono uppercase tracking-widest mb-4">Up Next</div>
                  <div className="text-4xl font-bold mb-4 text-slate-300">{nextRound?.name || 'Conclusion'}</div>
                  <div className="text-lg text-slate-400">{nextRound?.description || 'Stay tuned for final results.'}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer / Progress Bar */}
        <div className="mt-12">
          <div className="flex justify-center gap-4 mb-4">
            <button onClick={() => setView('welcome')} className={`h-2 rounded-full transition-all duration-500 ${view === 'welcome' ? 'w-12 bg-white' : 'w-2 bg-white/20'}`} />
            <button onClick={() => setView('leaderboard')} className={`h-2 rounded-full transition-all duration-500 ${view === 'leaderboard' ? 'w-12 bg-white' : 'w-2 bg-white/20'}`} />
            <button onClick={() => setView('up-next')} className={`h-2 rounded-full transition-all duration-500 ${view === 'up-next' ? 'w-12 bg-white' : 'w-2 bg-white/20'}`} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-pulse-slow {
          animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
