'use client'
import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  const [name, setName] = React.useState('')
  const [kind, setKind] = React.useState<'team' | 'individual'>('team')
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return toast.error('Missing token')
    if (name.trim().length < 2) return toast.error('Enter a valid name')
    setLoading(true)
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, kind }) })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Registration failed')
        setLoading(false)
        return
      }
      toast.success('Registered!')
      router.push(window.location.pathname.replace('/register', ''))
    } catch (e) {
      console.error(e)
      toast.error('Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card border border-border rounded-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-card-foreground mb-2">Join the Event</h1>
          <p className="text-muted-foreground text-sm">
            Enter your details to register for this competition. Make sure your name is unique.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">Participant Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Rocket"
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Must be at least 2 characters and unique</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">Registration Type</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register Now'}
          </button>
          {!token && <p className="text-sm text-red-400 text-center">Invalid or missing registration token.</p>}
        </form>
      </div>
    </div>
  )
}
