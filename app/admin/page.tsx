"use client"
import React from 'react'
import QRCode from 'qrcode'
import { ProtectedPage } from '../../lib/protected-page'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Participant = { id: string; name: string; score: number; kind: 'team' | 'individual'; createdAt: number }
type ConflictStatus = { [id: string]: { conflict: boolean; variance: number } }

function AdminPageContent() {
  const [qr, setQr] = React.useState<string>('')
  const [participants, setParticipants] = React.useState<Participant[]>([])
  const [lastSnapshotAt, setLastSnapshotAt] = React.useState<number>(0)
  const [judgingMode, setJudgingMode] = React.useState<'blinded'|'aggregateVisible'>('aggregateVisible')
  const [conflicts, setConflicts] = React.useState<ConflictStatus>({})
  const [completedMap, setCompletedMap] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    const es = new EventSource('/api/sse')
    es.onmessage = (ev) => {
      const payload = JSON.parse(ev.data)
        if (payload.type === 'snapshot' || payload.type === 'leaderboard') {
          setParticipants(payload.leaderboard)
          setLastSnapshotAt(Date.now())
          for (const p of payload.leaderboard) {
            fetch(`/api/judge/score?participantId=${p.id}`).then(r=>r.json()).then(d=>{
              setConflicts(prev => ({ ...prev, [p.id]: { conflict: d.conflict, variance: d.variance } }))
              setCompletedMap(prev => ({ ...prev, [p.id]: !!d.completedCurrentRound }))
            }).catch(()=>{})
          }
        }
        if (payload.type === 'round-completion') {
          const rc = (payload as any)
          if (rc && rc.participantId) {
            setCompletedMap(prev => ({ ...prev, [rc.participantId]: true }))
          }
        }
    }
    fetch('/api/event/settings').then(r=>r.json()).then(d=>{ if (d.judgingMode) setJudgingMode(d.judgingMode) }).catch(()=>{})
    return () => es.close()
  }, [])

  async function createQR(kind: 'team' | 'individual') {
    const res = await fetch('/api/register-token', { method: 'POST' })
    const { token } = await res.json()
    const url = `${window.location.origin}/register?token=${encodeURIComponent(token)}&kind=${kind}`
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, scale: 6, color: { dark: '#0b1221ff', light: '#ffffffff' } })
    setQr(dataUrl)
  }

  async function bumpRandom() {
    if (participants.length === 0) return
    const index = Math.floor(Math.random() * participants.length)
    const p = participants[index]
    const delta = Math.random() < 0.5 ? -1 : 1
    await fetch('/api/score', { method: 'POST', body: JSON.stringify({ id: p.id, delta }), headers: { 'Content-Type': 'application/json' } })
  }

  return (
    <div className="grid">
      <Card className="" style={{ gridColumn: 'span 12', background: 'linear-gradient(135deg, rgba(89, 209, 255, 0.1), rgba(94, 230, 164, 0.05))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0' }}>👨‍💼 Admin Panel</h2>
            <p className="small" style={{ margin: 0 }}>Manage participants, scoring rules, and tournament settings.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a href="/admin/settings" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: 'var(--bg)', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
              ⚙️ Feature Settings
            </a>
            <a href="/admin/rounds" style={{ padding: '0.75rem 1.5rem', background: 'var(--good)', color: 'var(--bg)', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
              🎯 Rounds
            </a>
            <a href="/admin/rubric" style={{ padding: '0.75rem 1.5rem', background: 'var(--warn)', color: 'var(--bg)', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
              📋 Rubric
            </a>
          </div>
        </div>
      </Card>

      <Card style={{ gridColumn: 'span 6' }}>
        <h3>📱 Registration</h3>
        <p className="small">Generate QR codes to onboard teams/individuals quickly. Share the code via phone or display.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button onClick={() => createQR('team')} aria-label="Generate team registration QR" aria-live="polite">👥 Team QR</Button>
          <Button variant="secondary" onClick={() => createQR('individual')} aria-label="Generate individual registration QR" aria-live="polite">👤 Individual QR</Button>
        </div>
        {qr && (
          <div style={{ background: '#fff', padding: 12, borderRadius: 8, textAlign: 'center' }}>
            <img src={qr} alt="Registration QR Code" style={{ width: 200, height: 200 }} />
            <div className="small" role="status" aria-live="polite" style={{ marginTop: 8, color: '#00131f' }}>Scan with phone to register</div>
          </div>
        )}
      </Card>

      <Card style={{ gridColumn: 'span 6' }}>
        <h3>⚖️ Judging Settings</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <label htmlFor="judge-mode-select" style={{ fontWeight: 500 }}>Mode:</label>
          <select
            id="judge-mode-select"
            value={judgingMode}
            onChange={async (e) => {
              const mode = e.target.value as 'blinded' | 'aggregateVisible'
              setJudgingMode(mode)
              await fetch('/api/event/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ judgingMode: mode }) })
            }}
          >
            <option value="aggregateVisible">📊 Aggregate Visible</option>
            <option value="blinded">🔒 Blinded</option>
          </select>
        </div>
        <p className="small" style={{ margin: 0, color: 'var(--muted)' }}>
          {judgingMode === 'aggregateVisible' ? '✓ Judges can see current totals.' : '✓ Judges cannot see other scores.'}
        </p>
      </Card>

      <Card style={{ gridColumn: 'span 12' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>👥 Participants</h3>
          <Button variant="secondary" onClick={bumpRandom} aria-label="Add random score">📈 Demo Score</Button>
        </div>
        <div className="small" style={{ marginBottom: 12, color: 'var(--muted)' }}>Last update: {lastSnapshotAt ? new Date(lastSnapshotAt).toLocaleTimeString() : '—'}</div>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {participants.map(p => {
              const cf = conflicts[p.id]
              return (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', transition: 'background 200ms' }}>
                  <span style={{ flex: 1 }}>
                    <strong>{p.name}</strong>
                    <span className="badge primary" style={{ marginLeft: 8 }}>{p.kind}</span>
                    {completedMap[p.id] && <span className="badge success" style={{ marginLeft: 8 }}>✅ Completed</span>}
                    {cf?.conflict && <span className="badge danger" style={{ marginLeft: 8 }}>⚠️ Conflict</span>}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: '1.1rem' }}>{p.score}</span>
                </li>
              )
            })}
            {participants.length === 0 && (
              <li style={{ padding: 12, textAlign: 'center', color: 'var(--muted)' }}>No participants yet. Generate a QR code to get started.</li>
            )}
          </ul>
        </div>
      </Card>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedPage requiredRole="admin">
      <AdminPageContent />
    </ProtectedPage>
  )
}
