'use client'
import React from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'

export default function KioskPage() {
  const params = useParams()
  const eventSlug = params.eventSlug as string
  const [tokenUrl, setTokenUrl] = React.useState<string | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [kind, setKind] = React.useState<'team' | 'individual'>('team')
  const [loading, setLoading] = React.useState(false)

  const createKiosk = async () => {
    try {
      const res = await fetch(`/api/events/${eventSlug}/register-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usesLeft: null, expiresInMinutes: 60 * 24 }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      setTokenUrl(data.url)
      setToken(data.token)
      toast.success('Kiosk token created')
    } catch (e) {
      console.error(e)
      toast.error('Failed to create kiosk token')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return toast.error('No kiosk token')
    setLoading(true)
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, kind }) })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Registration failed')
        setLoading(false)
        return
      }
      toast.success('Registered')
      setName('')
    } catch (e) {
      console.error(e)
      toast.error('Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">On-Site Registration Kiosk</h1>
          <p className="text-muted-foreground">Generate a temporary QR code for participants to scan and register quickly.</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Step 1: Generate Kiosk Token</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create a temporary registration link that expires in 24 hours. Participants can scan the QR code or use the link to join.
          </p>
          <button onClick={createKiosk} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Generate New Token
          </button>
        </div>

        {tokenUrl && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Step 2: Share the QR Code</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Display this QR code on a screen or print it. Participants scan it to access the registration form.
            </p>
            <div className="bg-white p-4 rounded-lg inline-block">
              <QRCodeSVG value={tokenUrl} size={200} />
            </div>
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">Registration Link</div>
              <div className="flex gap-2">
                <input value={tokenUrl} readOnly className="flex-1 px-3 py-2 rounded border border-border bg-background text-foreground text-sm" />
                <button onClick={() => { navigator.clipboard.writeText(tokenUrl); toast.success('Copied') }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Step 3: Register Participants</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Use this form to manually register participants if they can't scan the QR code.
          </p>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Participant Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Team Alpha"
                className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Type</label>
              <select
                value={kind}
                onChange={e => setKind(e.target.value as any)}
                className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
              >
                <option value="team">Team</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={loading || !token}
            >
              {loading ? 'Registering...' : 'Register Participant'}
            </button>
            {!token && <p className="text-sm text-muted-foreground">Generate a token first to enable registration.</p>}
          </form>
        </div>
      </div>
    </div>
  )
}
