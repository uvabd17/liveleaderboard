'use client'
import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

export default function JudgeJoinPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const token = params.get('token')

  const [loading, setLoading] = React.useState(false)
  const [invite, setInvite] = React.useState<any>(null)
  const [event, setEvent] = React.useState<any>(null)

  React.useEffect(() => {
    if (!token) return
    fetch(`/api/judge/validate?token=${encodeURIComponent(token)}`).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Invalid invite')
        return
      }
      const data = await res.json()
      setInvite(data.invite)
      setEvent(data.event)
    }).catch((e) => {
      console.error(e)
      toast.error('Failed to validate invite')
    })
  }, [token])

  const handleJoin = async () => {
    if (!token) return
    if (status !== 'authenticated') {
      // Redirect to sign in with callback to this page
      const returnTo = encodeURIComponent(window.location.href)
      window.location.href = `/auth/signin?callbackUrl=${returnTo}`
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/judge/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Failed to join')
        setLoading(false)
        return
      }
      const data = await res.json()
      toast.success('Joined as judge')
      try {
        const stored = localStorage?.getItem('user-role')
        if (stored === 'admin') {
          // preserve admin role but mark that this user has registered as a judge
          localStorage?.setItem('user-role-judge', 'true')
        } else {
          // not an admin: set role to judge
          localStorage?.setItem('user-role', 'judge')
        }
      } catch (e) {
        // ignore
      }
      // Force full reload so the `AuthProvider` re-reads stored role/flags
      window.location.href = `/e/${event?.slug ?? ''}/judge`
    } catch (e) {
      console.error(e)
      toast.error('Failed to join')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return <div className="p-8">Invalid invite link</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-card border border-border rounded-lg p-8">
        <h1 className="text-2xl font-bold text-card-foreground mb-4">Join as Judge</h1>
        {event && (
          <p className="text-muted-foreground mb-6">You were invited to judge: <strong className="text-card-foreground">{event.name}</strong></p>
        )}
        <div className="space-y-4">
          <button onClick={handleJoin} className="px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium">{status === 'authenticated' ? (loading ? 'Joining...' : 'Join as Judge') : 'Sign in to Join'}</button>
        </div>
      </div>
    </div>
  )
}
