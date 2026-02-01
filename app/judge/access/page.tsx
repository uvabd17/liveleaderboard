'use client'
import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, ArrowRight, QrCode, Mail } from 'lucide-react'

export default function JudgeAccessPage() {
  const params = useSearchParams()
  const router = useRouter()
  const eventSlug = params.get('eventSlug')
  
  const [inviteToken, setInviteToken] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteToken.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Try to validate the token first
      const res = await fetch(`/api/judge/validate?token=${encodeURIComponent(inviteToken.trim())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error === 'expired' ? 'This invite link has expired' : 'Invalid invite token')
        setLoading(false)
        return
      }
      
      const data = await res.json()
      // Redirect to the join page with the token
      if (data.event?.slug) {
        router.push(`/e/${data.event.slug}/judge/join?token=${encodeURIComponent(inviteToken.trim())}`)
      } else {
        setError('Could not determine event. Please use the full invite link.')
      }
    } catch (e) {
      setError('Failed to validate token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Judge Access
          </h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Enter your invite token or use the QR code/link provided by the event administrator.
          </p>
        </div>

        {/* Token Entry Form */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest mb-2">
                Invite Token
              </label>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="Paste your invite token here..."
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !inviteToken.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              {loading ? 'Validating...' : 'Access Judge Portal'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0f172a] px-4 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Or
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
              <QrCode className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Scan QR Code</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Ask the event administrator for the judge QR code and scan it with your phone.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
              <Mail className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Check Your Email</h4>
                <p className="text-slate-400 text-xs mt-1">
                  If you were invited via email, click the link in your invitation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link 
            href={eventSlug ? `/e/${eventSlug}` : '/'}
            className="text-slate-500 hover:text-white text-sm transition-colors"
          >
            ← Back to {eventSlug ? 'Event' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
