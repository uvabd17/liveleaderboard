'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { Copy, RefreshCw, ExternalLink } from 'lucide-react'

interface AdminConnectTabProps {
  eventSlug: string
  publicURL: string
}

export function AdminConnectTab({ eventSlug, publicURL }: AdminConnectTabProps) {
  const [activeSection, setActiveSection] = useState<'leaderboard' | 'stage' | 'registration' | 'judge' | 'kiosk'>('leaderboard')
  const [registrationLink, setRegistrationLink] = useState<string | null>(null)
  const [registrationLinkLoading, setRegistrationLinkLoading] = useState(false)
  const [judgeInvite, setJudgeInvite] = useState<{ inviteUrl: string; token: string } | null>(null)
  const [judgeInviteLoading, setJudgeInviteLoading] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} Copied`)
  }

  const ensureRegistrationLink = async (forceNew = false) => {
    if (registrationLink && !forceNew) return
    setRegistrationLinkLoading(true)
    try {
      // If not forcing new, check existing first
      if (!forceNew) {
        const res = await fetch(`/api/events/${eventSlug}/register-tokens`)
        if (res.ok) {
          const data = await res.json()
          const existing = data.tokens?.find((t: any) => {
            if (!t.public) return false
            if (t.expiresAt && new Date(t.expiresAt) < new Date()) return false
            return true
          })
          if (existing) {
            setRegistrationLink(`${window.location.origin}/e/${eventSlug}/register?token=${encodeURIComponent(existing.token)}`)
            setRegistrationLinkLoading(false)
            return
          }
        }
      }

      // Create new token
      const createRes = await fetch(`/api/events/${eventSlug}/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: true, usesLeft: null })
      })
      if (createRes.ok) {
        const data = await createRes.json()
        setRegistrationLink(`${window.location.origin}/e/${eventSlug}/register?token=${encodeURIComponent(data.token)}`)
        if (forceNew) {
          toast.success('New registration token generated')
        }
      }
    } catch (e) {
      toast.error('Failed to load registration link')
    } finally {
      setRegistrationLinkLoading(false)
    }
  }

  const ensureJudgeInvite = async (forceNew = false) => {
    if (judgeInvite && !forceNew) return
    setJudgeInviteLoading(true)
    try {
      const res = await fetch(`/api/events/${eventSlug}/judge-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'General Invite' })
      })
      if (res.ok) {
        const data = await res.json()
        // Use inviteUrl from API response which includes correct /e/{slug}/judge/join path
        setJudgeInvite({
          inviteUrl: data.inviteUrl || `${window.location.origin}/e/${eventSlug}/judge/join?token=${data.token}`,
          token: data.token
        })
        if (forceNew) {
          toast.success('New judge invite generated')
        }
      }
    } catch (e) {
      toast.error('Failed to create judge invite')
    } finally {
      setJudgeInviteLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'registration') ensureRegistrationLink()
    if (activeSection === 'judge') ensureJudgeInvite()
  }, [activeSection])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#1A1A1A] dark:text-white italic uppercase tracking-tighter">Connect & Share</h2>
          <p className="text-[#1A1A1A]/50 dark:text-slate-500 font-mono text-sm">QR CODES // ACCESS LINKS // PORTALS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'leaderboard', label: 'Public Standings', icon: '📊' },
            { id: 'stage', label: 'Stage Display', icon: '📺' },
            { id: 'registration', label: 'Registration Kiosk', icon: '📝' },
            { id: 'judge', label: 'Judge Invite', icon: '⚖️' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${
                activeSection === item.id
                  ? 'bg-[#1A1A1A] dark:bg-blue-600 text-white shadow-lg shadow-[#1A1A1A]/20 dark:shadow-blue-500/20'
                  : 'bg-[#1A1A1A]/5 dark:bg-white/5 text-[#1A1A1A]/60 dark:text-slate-400 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9">
          <div className="card rounded-[2.5rem] p-10 border-[#1A1A1A]/10 dark:border-white/10 min-h-[500px] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#1A1A1A]/5 dark:bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            {activeSection === 'leaderboard' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-[#1A1A1A] dark:text-white uppercase italic">Public Standings</h3>
                  <p className="text-[#1A1A1A]/50 dark:text-slate-500 mt-2 max-w-lg">
                    The main leaderboard view for spectators. Share this link or display this QR code around the venue.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row items-start gap-10">
                  <div className="p-6 bg-white rounded-3xl shadow-2xl">
                    <QRCodeSVG value={publicURL} size={200} />
                  </div>
                  <div className="flex-1 space-y-6 w-full max-w-md">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Public URL</label>
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={publicURL} 
                          className="flex-1 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl px-4 py-3 text-[#1A1A1A] dark:text-white font-mono text-sm focus:outline-none"
                        />
                        <button 
                          onClick={() => copyToClipboard(publicURL, 'URL')}
                          className="p-3 bg-[#1A1A1A] dark:bg-blue-600 hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-500 text-white rounded-xl transition-colors"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <a 
                      href={publicURL} 
                      target="_blank" 
                      className="flex items-center justify-center gap-2 w-full py-4 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl text-[#1A1A1A] dark:text-white font-bold transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in New Tab
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'stage' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-[#1A1A1A] dark:text-white uppercase italic">Master Event Display</h3>
                  <p className="text-[#1A1A1A]/50 dark:text-slate-500 mt-2 max-w-lg">
                    The unified display for projectors. Includes Live Leaderboard, Round Timers, and togglable Kiosk/QR Code mode for potential participants.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row items-start gap-10">
                  <div className="p-6 bg-white rounded-3xl shadow-2xl">
                    <QRCodeSVG value={`${publicURL}/stage`} size={200} />
                  </div>
                  <div className="flex-1 space-y-6 w-full max-w-md">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Display URL</label>
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={`${publicURL}/stage`} 
                          className="flex-1 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl px-4 py-3 text-[#1A1A1A] dark:text-white font-mono text-sm focus:outline-none"
                        />
                        <button 
                          onClick={() => copyToClipboard(`${publicURL}/stage`, 'Display URL')}
                          className="p-3 bg-[#1A1A1A] dark:bg-blue-600 hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-500 text-white rounded-xl transition-colors"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <a 
                      href={`${publicURL}/stage`} 
                      target="_blank" 
                      className="flex items-center justify-center gap-2 w-full py-4 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl text-[#1A1A1A] dark:text-white font-bold transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Launch Stage Display
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'registration' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-[#1A1A1A] dark:text-white uppercase italic">Registration Kiosk</h3>
                  <p className="text-[#1A1A1A]/50 dark:text-slate-500 mt-2 max-w-lg">
                    Direct link for participants to register. This link includes a secure token so they don't need an account.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row items-start gap-10">
                  <div className="p-6 bg-white rounded-3xl shadow-2xl relative">
                    {registrationLink ? (
                      <QRCodeSVG value={registrationLink} size={200} />
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 bg-slate-100 rounded-xl animate-pulse">
                        Loading...
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-6 w-full max-w-md">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Kiosk URL</label>
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={registrationLink || 'Generating...'} 
                          className="flex-1 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl px-4 py-3 text-[#1A1A1A] dark:text-white font-mono text-sm focus:outline-none"
                        />
                        <button 
                          onClick={() => registrationLink && copyToClipboard(registrationLink, 'Kiosk URL')}
                          disabled={!registrationLink}
                          className="p-3 bg-[#1A1A1A] dark:bg-blue-600 hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => ensureRegistrationLink(true)}
                      disabled={registrationLinkLoading}
                      className="flex items-center justify-center gap-2 w-full py-4 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl text-[#1A1A1A] dark:text-white font-bold transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${registrationLinkLoading ? 'animate-spin' : ''}`} />
                      Generate New Token
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'judge' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-[#1A1A1A] dark:text-white uppercase italic">Judge Invitation</h3>
                  <p className="text-[#1A1A1A]/50 dark:text-slate-500 mt-2 max-w-lg">
                    Secure link for judges to access the scoring portal. Do not share this publicly.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row items-start gap-10">
                  <div className="p-6 bg-white rounded-3xl shadow-2xl">
                    {judgeInvite ? (
                      <QRCodeSVG value={judgeInvite.inviteUrl} size={200} />
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 bg-slate-100 rounded-xl animate-pulse">
                        Loading...
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-6 w-full max-w-md">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Invite Link</label>
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={judgeInvite?.inviteUrl || 'Generating...'} 
                          className="flex-1 bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl px-4 py-3 text-[#1A1A1A] dark:text-white font-mono text-sm focus:outline-none"
                        />
                        <button 
                          onClick={() => judgeInvite && copyToClipboard(judgeInvite.inviteUrl, 'Invite Link')}
                          disabled={!judgeInvite}
                          className="p-3 bg-[#1A1A1A] dark:bg-blue-600 hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => ensureJudgeInvite(true)}
                      disabled={judgeInviteLoading}
                      className="flex items-center justify-center gap-2 w-full py-4 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl text-[#1A1A1A] dark:text-white font-bold transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${judgeInviteLoading ? 'animate-spin' : ''}`} />
                      Generate New Invite
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
