"use client"
import React from 'react'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function RegisterPage({ searchParams }: { searchParams: { token?: string; kind?: string } }) {
  const [name, setName] = React.useState('')
  const token = searchParams?.token || ''
  const kind = (searchParams?.kind === 'team' || searchParams?.kind === 'individual') ? searchParams.kind : 'team'
  const [status, setStatus] = React.useState<'idle' | 'ok' | 'error'>('idle')
  const [error, setError] = React.useState<string>('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
    setError('')
    const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, kind }) })
    if (res.ok) {
      setStatus('ok')
    } else {
      const j = await res.json().catch(()=>({error:'error'}))
      setError(j.error || 'Registration failed')
      setStatus('error')
    }
  }

  return (
    <div className="grid">
      <Card style={{ gridColumn: 'span 6' }}>
        <h2>Register {kind === 'team' ? 'Team' : 'Individual'}</h2>
        {!token && <div className="badge danger" style={{ marginBottom: 12 }}>⚠️ Missing registration token</div>}
        <form onSubmit={submit} aria-label={`Register ${kind}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="name-input" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              {kind === 'team' ? 'Team Name' : 'Your Name'}
            </label>
            <input
              id="name-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder={kind === 'team' ? 'Enter team name' : 'Enter your name'}
              style={{ width: '100%' }}
              minLength={2}
              maxLength={100}
              aria-describedby="name-help"
            />
            <div id="name-help" className="small" style={{ marginTop: 6, color: '#9aa' }}>
              {kind === 'team' ? 'Choose a unique team name for this event.' : 'Use your real name to help judges.'}
            </div>
          </div>
          <Button
            type="submit"
            disabled={!token || name.trim().length < 2}
            aria-busy={status !== 'idle'}
          >
            {status === 'idle' ? 'Join Competition' : 'Processing...'}
          </Button>
        </form>
        {status === 'ok' && (
          <div className="badge success" style={{ marginTop: 12 }} role="status" aria-live="polite">
            ✓ Successfully registered! Redirecting...
          </div>
        )}
        {status === 'error' && (
          <div className="badge danger" style={{ marginTop: 12 }} role="alert" aria-live="assertive">
            ✗ {error}
          </div>
        )}
        <div className="small" style={{ marginTop: 16, color: 'var(--muted)' }}>
          Registration tokens are single-use. Share this link with your team members to join.
        </div>
      </Card>
      <Card style={{ gridColumn: 'span 6' }}>
        <h3>About Registration</h3>
        <ul className="small">
          <li>Each token can only be used once</li>
          <li>Names must be unique per event</li>
          <li>Your scores update live on the leaderboard</li>
          <li>Admin can control visibility and scoring modes</li>
        </ul>
      </Card>
    </div>
  )
}
