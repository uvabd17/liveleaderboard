'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrandingUpload } from '@/components/branding-upload'
import toast from 'react-hot-toast'
import { Trophy, Activity, MessageSquare, ChevronRight, Share2, Sparkles, Target, Settings, LayoutDashboard } from 'lucide-react'
import { BroadcastTicker } from '@/components/broadcast-ticker'

interface Participant {
  id: string
  name: string
  kind: string
  profile: any
  event: {
    id: string
    name: string
    slug: string
    brandColors?: {
      primary: string
      secondary: string
      accent: string
    }
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

        const profile = data.participant.profile || {}
        setTeamMembers(Array.isArray(profile.teamMembers) ? profile.teamMembers : [])
        setIdea(profile.idea || '')

        try {
          const [eventRes, compRes] = await Promise.all([
            fetch(`/api/events/${eventSlug}`),
            fetch(`/api/judge/score?participantId=${data.participant.id}`)
          ])
          if (eventRes.ok) {
            const je = await eventRes.json()
            setRoundsConfig(Array.isArray(je.event?.rules?.rounds) ? je.event.rules.rounds : [])
          }
          if (compRes.ok) {
            const jc = await compRes.json()
            setCompletedRounds(Array.isArray(jc.completedRounds) ? jc.completedRounds : [])
          }

          const allCompsRes = await fetch(`/api/events/${eventSlug}/round-completions`)
          if (allCompsRes.ok) {
            const ac = await allCompsRes.json()
            const rows = Array.isArray(ac.rows) ? ac.rows.filter((r: any) => r.participantId === data.participant.id) : []
            setParticipantCompletions(rows)
          }
        } catch (e) { }
      } else {
        toast.error('Invalid access token')
        router.push(`/e/${eventSlug}`)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Connection failed')
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
        toast.success('Visual Identity Updated!')
        fetchParticipantData()
      }
    } catch (error) {
      toast.error('Update failed')
    }
  }

  const handleSaveProfileContent = async () => {
    try {
      const response = await fetch('/api/participant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          profile: {
            ...participant?.profile,
            teamMembers,
            idea,
          },
        }),
      })

      if (response.ok) {
        toast.success('Strategy Updated!')
        setEditing(false)
        fetchParticipantData()
      }
    } catch (error) {
      toast.error('Save failed')
    }
  }

  const brandPrimary = participant?.event?.brandColors?.primary || '#3b82f6'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1A1A1A]/20 dark:border-indigo-500/20 border-t-[#1A1A1A] dark:border-t-indigo-500 rounded-full animate-spin" />
          <div className="text-[#1A1A1A]/50 dark:text-slate-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">Initializing Participant Dashboard...</div>
        </div>
      </div>
    )
  }

  if (!participant) return null

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-slate-200 selection:bg-[#1A1A1A]/10 dark:selection:bg-indigo-500/30 overflow-x-hidden">
      <BroadcastTicker />

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-10"
          style={{ backgroundColor: brandPrimary }}
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center" />
      </div>

      <header className="sticky top-0 z-40 bg-[#FAF9F6]/80 dark:bg-[#020617]/50 backdrop-blur-xl border-b border-[#1A1A1A]/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10">
              <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-[#1A1A1A] dark:text-white leading-none">Participant Dashboard</h1>
              <p className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono uppercase tracking-[0.2em] mt-1">{participant.event.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/e/${participant.event.slug}`}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 text-xs font-bold transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Public Board
            </Link>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${participant.name} @ ${participant.event.name}`,
                    url: window.location.href
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied to clipboard')
                }
              }}
              className="p-2.5 bg-[#1A1A1A] dark:bg-indigo-600 hover:bg-[#1A1A1A]/80 dark:hover:bg-indigo-500 rounded-xl shadow-lg shadow-[#1A1A1A]/20 dark:shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10 animate-fade-in">

        {/* HERO STATS HUD */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden card rounded-[2rem] p-8 border-[#1A1A1A]/10 dark:border-white/10 group">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
              <Trophy className="w-20 h-20 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="relative z-10 space-y-1">
              <span className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.2em] uppercase">Global Ranking</span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-[#1A1A1A] dark:text-white italic tracking-tighter">#{participant.rank}</span>
                <span className="text-sm font-bold text-[#1A1A1A]/50 dark:text-slate-500 uppercase italic">Overall</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden card rounded-[2rem] p-8 border-[#1A1A1A]/10 dark:border-white/10 group">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
              <Activity className="w-20 h-20 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="relative z-10 space-y-1">
              <span className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.2em] uppercase">Total Performance</span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-[#1A1A1A] dark:text-white italic tracking-tighter">{participant.totalScore}</span>
                <span className="text-sm font-bold text-[#1A1A1A]/50 dark:text-slate-500 uppercase italic">PTS</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden card rounded-[2rem] p-8 border-[#1A1A1A]/10 dark:border-white/10 group">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
              <Target className="w-20 h-20 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="relative z-10 space-y-1">
              <span className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.2em] uppercase">Class / Format</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#1A1A1A] dark:text-white italic tracking-tighter uppercase truncate">{participant.kind}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black font-mono text-blue-600 dark:text-blue-400 uppercase tracking-widest">Active Status</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ROUND PROGRESSION */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.3em] uppercase italic">Event Logs</h3>
              <div className="text-[10px] text-[#1A1A1A]/40 dark:text-slate-600 font-mono italic">{completedRounds.length} / {roundsConfig.length} COMPLETED</div>
            </div>

            <div className="space-y-4">
              {roundsConfig.map((r: any, idx: number) => {
                const rn = idx + 1
                const completed = completedRounds.includes(rn)
                const detail = participantCompletions.find((c: any) => c.roundNumber === rn)
                return (
                  <div
                    key={idx}
                    className={`card p-6 rounded-3xl border transition-all duration-300 ${completed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[#1A1A1A]/5 dark:border-white/5 bg-[#1A1A1A]/5 dark:bg-slate-900/40'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-[#1A1A1A]/5 dark:bg-white/5 rounded text-[#1A1A1A]/50 dark:text-slate-500">PHASE 0{rn}</span>
                          <h4 className="font-black text-[#1A1A1A] dark:text-white uppercase italic tracking-tight">{r.name || `Round ${rn}`}</h4>
                        </div>
                        <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono uppercase tracking-widest">
                          {r.roundDurationMinutes} MINUTE WINDOW
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {completed ? (
                          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Success</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-full flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]/30 dark:bg-slate-500" />
                            <span className="text-[10px] font-black text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest italic">Pending</span>
                          </div>
                        )}
                        {detail && (
                          <span className="text-[10px] font-mono text-slate-600">SIG@ {new Date(detail.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>

                    {detail && detail.comments && detail.comments.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-[#1A1A1A]/5 dark:border-white/5 space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Feedback Intercepted</span>
                        </div>
                        <div className="space-y-2">
                          {detail.comments.map((c: any, i: number) => (
                            <div key={i} className="p-3 bg-[#1A1A1A]/5 dark:bg-white/5 rounded-xl border border-[#1A1A1A]/5 dark:border-white/5 italic text-sm text-[#1A1A1A]/60 dark:text-slate-400 leading-relaxed">
                              "{c.comment}"
                              <div className="mt-2 text-[8px] font-mono text-[#1A1A1A]/40 dark:text-slate-600 uppercase tracking-[0.2em]">{c.judgeUserId || 'JUDGE_01'} // FIELD_REPORT</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* IDENTITY & PROFILE */}
          <div className="space-y-8">
            <div className="card p-10 rounded-[2.5rem] border-[#1A1A1A]/10 dark:border-white/10 bg-gradient-to-br from-indigo-100/30 dark:from-indigo-900/10 to-transparent">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.3em] uppercase italic">Participant Identity</h3>
                <Settings className="w-4 h-4 text-[#1A1A1A]/40 dark:text-slate-600" />
              </div>

              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <BrandingUpload
                        currentLogo={participant.profile?.logo || null}
                        currentColors={participant.profile?.brandColors || null}
                        onUpload={handleProfileUpdate}
                        label={participant.kind === 'team' ? 'Team Insignia' : 'Identity Photo'}
                      />
                    </div>
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <div className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400 uppercase mb-1">{participant.kind} REGISTERED</div>
                    <h2 className="text-4xl font-black text-[#1A1A1A] dark:text-white italic tracking-tighter uppercase">{participant.name}</h2>
                    <p className="text-xs text-[#1A1A1A]/50 dark:text-slate-500 font-mono mt-2 truncate max-w-xs">{participant.event.organization.name} // AUTH_OK</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Strategy / Pitch</label>
                    <button
                      onClick={handleSaveProfileContent}
                      className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase hover:underline"
                    >
                      Update Status
                    </button>
                  </div>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    className="w-full bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-2xl p-6 text-[#1A1A1A] dark:text-slate-300 font-medium placeholder:text-[#1A1A1A]/30 dark:placeholder:text-slate-800 min-h-[140px] focus:border-indigo-500/30 outline-none transition-all resize-none italic"
                    placeholder="Describe your solution or presentation focus..."
                  />
                </div>

                {participant.kind === 'team' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Squad Roster</label>
                      <button
                        onClick={() => setEditing(!editing)}
                        className={`text-[10px] font-black uppercase hover:underline ${editing ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}
                      >
                        {editing ? 'FINALIZE' : 'MODIFY'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editing ? (
                        <>
                          {teamMembers.map((m, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={m}
                                onChange={(e) => {
                                  const n = [...teamMembers]
                                  n[idx] = e.target.value
                                  setTeamMembers(n)
                                }}
                                className="flex-grow bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-[#1A1A1A] dark:text-white focus:border-indigo-500/30 outline-none"
                                placeholder="Operator Name"
                              />
                              <button
                                onClick={() => setTeamMembers(teamMembers.filter((_, i) => i !== idx))}
                                className="px-4 py-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/10"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setTeamMembers([...teamMembers, ''])}
                            className="w-full py-3 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-dashed border-[#1A1A1A]/10 dark:border-white/10 rounded-xl text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase transition-all"
                          >
                            + Add Operator
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {teamMembers.length > 0 ? teamMembers.map((m, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-lg text-xs font-bold text-[#1A1A1A] dark:text-slate-300">
                              {m}
                            </span>
                          )) : (
                            <span className="text-xs text-[#1A1A1A]/40 dark:text-slate-600 font-mono italic">NO REGISTERED OPERATORS</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-8 rounded-3xl border-[#1A1A1A]/5 dark:border-white/5 bg-[#1A1A1A]/5 dark:bg-slate-900/40">
              <h3 className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-[0.2em] uppercase mb-4">Event Operations</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-[#1A1A1A]/40 dark:text-slate-600 block uppercase font-mono">Org</span>
                  <span className="text-sm font-bold text-[#1A1A1A] dark:text-white uppercase">{participant.event.organization.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#1A1A1A]/40 dark:text-slate-600 block uppercase font-mono">Start</span>
                  <span className="text-sm font-bold text-[#1A1A1A] dark:text-white uppercase">{participant.event.startAt ? new Date(participant.event.startAt).toLocaleDateString() : 'TBD'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-20 opacity-30">
        <div className="flex items-center justify-center gap-4 text-[10px] font-black font-mono text-[#1A1A1A]/40 dark:text-slate-600 uppercase tracking-[0.5em]">
          <span>Secured Link</span>
          <div className="w-1 h-1 rounded-full bg-[#1A1A1A]/20 dark:bg-slate-800" />
          <span>Participant Console v{participant.rank}</span>
          <div className="w-1 h-1 rounded-full bg-[#1A1A1A]/20 dark:bg-slate-800" />
          <span>Ready for Sync</span>
        </div>
      </footer>

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
