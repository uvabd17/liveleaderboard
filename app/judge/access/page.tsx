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
      const res = await fetch(`/api/judge/validate?token=${encodeURIComponent(inviteToken.trim())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error === 'expired' ? 'This invite link has expired' : 'Invalid invite token')
        setLoading(false)
        return
      }
      
      const data = await res.json()
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
    <div className="min-h-screen bg-cream text-charcoal flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-charcoal/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-charcoal/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-charcoal/5 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-charcoal/60" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            Judge Access
          </h1>
          <p className="text-charcoal/50 text-sm max-w-sm mx-auto">
            Enter your invite token or use the QR code/link provided by the event administrator.
          </p>
        </div>

        {/* Token Entry Form */}
        <div className="card p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Invite Token
              </label>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="Paste your invite token here..."
                className="input font-mono text-sm"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !inviteToken.trim()}
              className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? 'Validating...' : 'Access Judge Portal'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-charcoal/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-xs text-charcoal/40">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-4 p-4 bg-charcoal/5 rounded-xl">
              <QrCode className="w-5 h-5 text-charcoal/40 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-charcoal text-sm">Scan QR Code</h4>
                <p className="text-charcoal/50 text-xs mt-1">
                  Ask the event administrator for the judge QR code.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-charcoal/5 rounded-xl">
              <Mail className="w-5 h-5 text-charcoal/40 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-charcoal text-sm">Check Your Email</h4>
                <p className="text-charcoal/50 text-xs mt-1">
                  If invited via email, click the link in your invitation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link 
            href={eventSlug ? `/e/${eventSlug}` : '/'}
            className="text-charcoal/40 hover:text-charcoal text-sm transition-colors"
          >
            ← Back to {eventSlug ? 'Event' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
