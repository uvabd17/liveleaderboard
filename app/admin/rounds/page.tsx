"use client"
import React from 'react'
import { ProtectedPage } from '../../../lib/protected-page'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type RoundConfig = { number: number; name: string; durationMinutes: number; description?: string; judgingOpen?: boolean; judgingWindowMinutes?: number|null }
type RoundsState = { currentRound: number; rounds: RoundConfig[]; elimination: { enabled: boolean; cutoffRound: number; bottomPercent: number }; total: number }

function RoundsAdminContent() {
  const [state, setState] = React.useState<RoundsState>({ currentRound: 0, rounds: [], elimination: { enabled: false, cutoffRound: 0, bottomPercent: 0 }, total: 0 })
  const [newRound, setNewRound] = React.useState({ name: '', durationMinutes: 5, description: '' })
  const [elimConfig, setElimConfig] = React.useState({ enabled: false, cutoffRound: 0, bottomPercent: 10 })
  const [status, setStatus] = React.useState<'idle'|'saving'>('idle')

  React.useEffect(() => {
    fetch('/api/rounds').then(r=>r.json()).then(d=>setState(d)).catch(()=>{})
  }, [])

  async function addRound() {
    if (!newRound.name.trim()) return
    setStatus('saving')
    const updated = [...state.rounds, { number: state.rounds.length, ...newRound }]
    const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'configure', roundConfig: { number: state.rounds.length, ...newRound } }) })
    if (res.ok) {
      const d = await res.json()
      setState(s=>({ ...s, rounds: d.rounds }))
      setNewRound({ name: '', durationMinutes: 5, description: '' })
      setStatus('idle')
    }
  }

  async function nextRound() {
    setStatus('saving')
    const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'next' }) })
    if (res.ok) {
      const d = await res.json()
      setState(s=>({ ...s, currentRound: d.currentRound }))
      setStatus('idle')
    }
  }

  async function prevRound() {
    setStatus('saving')
    const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'prev' }) })
    if (res.ok) {
      const d = await res.json()
      setState(s=>({ ...s, currentRound: d.currentRound }))
      setStatus('idle')
    }
  }

  async function setElimination() {
    setStatus('saving')
    const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'configure', eliminationConfig: elimConfig }) })
    if (res.ok) {
      setStatus('idle')
    }
  }

  return (
    <div className="grid">
      <Card style={{gridColumn:'span 12'}}>
        <h2>Rounds & Timers</h2>
        <div className="small">Configure tournament rounds with timers and optional elimination.</div>
      </Card>

      <Card style={{gridColumn:'span 6'}}>
        <h3>Round Control</h3>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
          <Button variant="secondary" onClick={prevRound} disabled={state.currentRound === 0 || status==='saving'}>← Prev</Button>
          <div style={{flex:1, textAlign:'center'}}>
            <strong style={{fontSize:'1.2rem'}}>Round {state.currentRound + 1} of {state.rounds.length}</strong>
            {state.rounds[state.currentRound] && (
              <div className="small">
                {state.rounds[state.currentRound].name} ({state.rounds[state.currentRound].durationMinutes}m)
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={nextRound} disabled={state.currentRound >= state.rounds.length - 1 || status==='saving'}>Next →</Button>
        </div>
        <div style={{padding:12, background:'#0e1730', borderRadius:8}}>
          <div className="small">Timer: {state.rounds[state.currentRound]?.durationMinutes ?? '—'} minutes</div>
          <div className="small" style={{marginTop:6}}>Judging: {state.rounds[state.currentRound]?.judgingOpen ? 'Open' : 'Closed'}{typeof state.rounds[state.currentRound]?.judgingWindowMinutes === 'number' ? ` • Window: ${state.rounds[state.currentRound]?.judgingWindowMinutes}m` : ''}</div>
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <Button variant="secondary" aria-label="Open judging for current round" disabled={status==='saving'} onClick={async ()=>{
              setStatus('saving')
              const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'judging', judging: { roundNumber: state.currentRound, open: true } }) })
              if (res.ok) {
                const d = await res.json()
                setState(s=>({ ...s, rounds: d.rounds }))
              }
              setStatus('idle')
            }}>Open Judging</Button>
            <Button variant="secondary" aria-label="Close judging for current round" disabled={status==='saving'} onClick={async ()=>{
              setStatus('saving')
              const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'judging', judging: { roundNumber: state.currentRound, open: false } }) })
              if (res.ok) {
                const d = await res.json()
                setState(s=>({ ...s, rounds: d.rounds }))
              }
              setStatus('idle')
            }}>Close Judging</Button>
            <label htmlFor="judging-window" className="small" style={{display:'none'}}>Judging Window (minutes)</label>
            <input
              id="judging-window"
              type="number"
              min={1}
              placeholder="Window (m)"
              value={typeof state.rounds[state.currentRound]?.judgingWindowMinutes === 'number' ? (state.rounds[state.currentRound]?.judgingWindowMinutes as number) : ''}
              onChange={async (e)=>{
                const val = Number(e.target.value)
                if (!Number.isFinite(val) || val <= 0) return
                setStatus('saving')
                const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'judging', judging: { roundNumber: state.currentRound, windowMinutes: val } }) })
                if (res.ok) {
                  const d = await res.json()
                  setState(s=>({ ...s, rounds: d.rounds }))
                }
                setStatus('idle')
              }}
              style={{padding:10, borderRadius:8, background:'#0e1730', color:'var(--text)'}}
            />
            <Button variant="secondary" aria-label="Extend judging window by 5 minutes" disabled={status==='saving'} onClick={async ()=>{
              const current = state.rounds[state.currentRound]
              const base = typeof current?.judgingWindowMinutes === 'number' ? current.judgingWindowMinutes : 0
              const extended = base + 5
              setStatus('saving')
              const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'judging', judging: { roundNumber: state.currentRound, windowMinutes: extended } }) })
              if (res.ok) {
                const d = await res.json()
                setState(s=>({ ...s, rounds: d.rounds }))
              }
              setStatus('idle')
            }}>Extend +5m</Button>
            <Button variant="secondary" aria-label="Reset judging window start time" disabled={status==='saving'} onClick={async ()=>{
              setStatus('saving')
              const res = await fetch('/api/rounds', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'judging', judging: { roundNumber: state.currentRound, open: true } }) })
              if (res.ok) {
                const d = await res.json()
                setState(s=>({ ...s, rounds: d.rounds }))
              }
              setStatus('idle')
            }}>Reset Window</Button>
          </div>
          <div role="status" aria-live="polite" className="small" style={{marginTop:6, color:'#9aa'}}>
            Actions announce here for screen readers.
          </div>
        </div>
      </Card>

      <Card style={{gridColumn:'span 6'}}>
        <h3>Add Round</h3>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <input type="text" value={newRound.name} onChange={e=>setNewRound(p=>({...p, name: e.target.value}))} placeholder="Round Name (e.g., 'Ideation')" style={{padding:10, borderRadius:8, background:'#0e1730', color:'var(--text)'}} />
          <input type="number" min={1} value={newRound.durationMinutes} onChange={e=>setNewRound(p=>({...p, durationMinutes: Number(e.target.value)}))} placeholder="Duration (minutes)" style={{padding:10, borderRadius:8, background:'#0e1730', color:'var(--text)'}} />
          <input type="text" value={newRound.description} onChange={e=>setNewRound(p=>({...p, description: e.target.value}))} placeholder="Description (optional)" style={{padding:10, borderRadius:8, background:'#0e1730', color:'var(--text)'}} />
          <Button onClick={addRound} disabled={!newRound.name.trim() || status==='saving'}>Add Round</Button>
        </div>
      </Card>

      <Card style={{gridColumn:'span 6'}}>
        <h3>Elimination Mode</h3>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <label style={{display:'flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={elimConfig.enabled} onChange={e=>setElimConfig(p=>({...p, enabled: e.target.checked}))} />
            <span>Enable Elimination</span>
          </label>
          {elimConfig.enabled && (
            <>
              <div>
                <div className="small">Cutoff Round (trigger elimination after):</div>
                <input type="number" min={0} value={elimConfig.cutoffRound} onChange={e=>setElimConfig(p=>({...p, cutoffRound: Number(e.target.value)}))} style={{width:'100%', padding:10, borderRadius:8, background:'#0e1730', color:'var(--text)'}} />
              </div>
              <div>
                <div className="small">Bottom % to Eliminate:</div>
                <input type="number" min={0} max={100} step={5} value={elimConfig.bottomPercent} onChange={e=>setElimConfig(p=>({...p, bottomPercent: Number(e.target.value)}))} style={{width:'100%', padding:10, borderRadius:8, background:'#0e1730', color:'var(--text)'}} />
              </div>
              <Button onClick={setElimination} disabled={status==='saving'}>Save Elimination Config</Button>
            </>
          )}
        </div>
      </Card>

      <Card style={{gridColumn:'span 6'}}>
        <h3>Configured Rounds</h3>
        <ul>
          {state.rounds.map((r, i) => (
            <li key={i} style={{padding:8, background: i === state.currentRound ? '#1a2840' : 'transparent', borderRadius:4, display:'flex', justifyContent:'space-between'}}>
              <span><strong>{r.name}</strong> <span className="small">{r.description}</span></span>
              <span className="small">{r.durationMinutes}m</span>
            </li>
          ))}
          {state.rounds.length === 0 && <li className="small">No rounds configured yet.</li>}
        </ul>
      </Card>
    </div>
  )
}

export default function RoundsAdminPage() {
  return (
    <ProtectedPage requiredRole="admin">
      <RoundsAdminContent />
    </ProtectedPage>
  )
}
