"use client"
import React from 'react'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EventFeatures, mergeFeatures } from '@/lib/features'

type Row = { id: string; name: string; score: number; rank: number; kind: 'team' | 'individual' }

type EventPayload =
  | { type: 'snapshot'; leaderboard: Row[] }
  | { type: 'leaderboard'; leaderboard: Row[]; movers: { id: string; from: number; to: number }[] }
  | { type: 'round-change'; currentRound: number; roundsConfig: any[] }

export default function LeaderboardPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [moves, setMoves] = React.useState<Record<string, 'up' | 'down' | undefined>>({})
  const [currentRound, setCurrentRound] = React.useState(0)
  const [roundName, setRoundName] = React.useState('')
  const [roundDuration, setRoundDuration] = React.useState(0)
  const [timeLeft, setTimeLeft] = React.useState(0)
  const [features, setFeatures] = React.useState<EventFeatures | null>(null)
  const [showPodium, setShowPodium] = React.useState(false)
  const [momentumTracker, setMomentumTracker] = React.useState<Record<string, number>>({}) // tracks consecutive improvements

  // Load features on mount
  React.useEffect(() => {
    fetch('/api/event/settings')
      .then(r => r.json())
      .then(data => {
        if (data.features) {
          setFeatures(mergeFeatures(data.features))
        }
      })
      .catch(console.error)
  }, [])

  React.useEffect(() => {
    const es = new EventSource('/api/sse')
    es.onmessage = (ev) => {
      const payload: EventPayload = JSON.parse(ev.data)
      if (payload.type === 'snapshot') {
        setRows(payload.leaderboard)
        setMoves({})
      } else if (payload.type === 'leaderboard') {
        const movement: Record<string, 'up' | 'down' | undefined> = {}
        const newMomentum: Record<string, number> = {}
        
        for (const m of payload.movers) {
          if (m.from === m.to) continue
          movement[m.id] = m.to < m.from ? 'up' : 'down'
          
          // Track momentum for "on fire" indicator
          if (m.to < m.from) {
            newMomentum[m.id] = (momentumTracker[m.id] || 0) + 1
          }
        }
        
        setMoves(movement)
        setRows(payload.leaderboard)
        setMomentumTracker(newMomentum)
        
        // clear movers after animation duration
        setTimeout(() => setMoves({}), 500)
      } else if (payload.type === 'round-change') {
        setCurrentRound(payload.currentRound)
        const rc = payload.roundsConfig[payload.currentRound]
        if (rc) {
          setRoundName(rc.name)
          setRoundDuration(rc.durationMinutes * 60)
          setTimeLeft(rc.durationMinutes * 60)
        }
      }
    }
    fetch('/api/rounds').then(r=>r.json()).then(d=>{
      if (d.rounds.length > 0) {
        setCurrentRound(d.currentRound ?? 0)
        const rc = d.rounds[d.currentRound ?? 0]
        if (rc) {
          setRoundName(rc.name)
          setRoundDuration(rc.durationMinutes * 60)
          setTimeLeft(rc.durationMinutes * 60)
        }
      }
    }).catch(()=>{})
    return () => es.close()
  }, [momentumTracker])

  React.useEffect(() => {
    if (roundDuration === 0 || timeLeft === 0) return
    const timer = setTimeout(() => {
      setTimeLeft(t => Math.max(0, t - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, roundDuration])

  const podiumEnabled = features?.presentation.podiumWinners.enabled
  const podiumTopN = features?.presentation.podiumWinners.topN || 3
  const momentumEnabled = features?.competitive.momentumIndicators
  const podiumRows = rows.slice(0, podiumTopN)
  const regularRows = showPodium ? [] : rows

  return (
    <div className="grid">
      {roundName && (
        <Card style={{ gridColumn: 'span 12', background: 'linear-gradient(135deg, rgba(94, 230, 164, 0.1), rgba(89, 209, 255, 0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
            <div>
              <div className="small" style={{ marginBottom: 8, color: 'var(--muted)' }}>Round {currentRound + 1}</div>
              <h2 style={{ margin: 0, color: 'var(--good)' }}>{roundName}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="small" style={{ marginBottom: 8, color: 'var(--muted)' }}>Time Remaining</div>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
                color: timeLeft <= 60 ? 'var(--bad)' : 'var(--accent)',
                transition: 'color 200ms ease'
              }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
          </div>
          <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, marginTop: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: timeLeft <= 60 ? 'var(--bad)' : 'var(--good)',
              width: `${(timeLeft / roundDuration) * 100}%`,
              transition: 'width 1s linear'
            }} />
          </div>
        </Card>
      )}

      {/* Podium View */}
      {podiumEnabled && showPodium && podiumRows.length > 0 && (
        <Card style={{ gridColumn: 'span 12' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2>🏆 Top {podiumTopN} Winners</h2>
            <Button onClick={() => setShowPodium(false)} className="" style={{ padding: '0.5rem 1rem' }}>
              Show Full Leaderboard
            </Button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {podiumRows.map((r, idx) => {
              const heights = ['280px', '240px', '200px', '180px', '160px', '140px', '120px', '100px', '80px', '60px']
              return (
                <div
                  key={r.id}
                  style={{
                    background: idx === 0 ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : idx === 1 ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8)' : idx === 2 ? 'linear-gradient(135deg, #cd7f32, #e8a87c)' : 'linear-gradient(135deg, rgba(94, 230, 164, 0.3), rgba(89, 209, 255, 0.2))',
                    color: idx <= 2 ? '#000' : 'var(--text)',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '180px',
                    height: heights[idx] || '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    animation: 'podiumRise 0.6s ease-out',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>#{r.rank}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{r.name}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{r.score} pts</div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Regular Leaderboard */}
      {!showPodium && (
        <Card style={{ gridColumn: 'span 12' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2>Live Leaderboard</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className="badge primary">Live via SSE</span>
              {podiumEnabled && rows.length >= podiumTopN && (
                <Button onClick={() => setShowPodium(true)} className="" style={{ padding: '0.5rem 1rem' }}>
                  🏆 Show Podium
                </Button>
              )}
            </div>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 600 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Rank</th>
                  <th>Participant</th>
                  <th style={{ width: 140 }}>Type</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Score</th>
                  {momentumEnabled && <th style={{ width: 100, textAlign: 'center' }}>Momentum</th>}
                </tr>
              </thead>
              <tbody>
                {regularRows.map(r => {
                  const onFire = momentumEnabled && (momentumTracker[r.id] || 0) >= 2
                  return (
                    <tr key={r.id} className={`rank-enter ${moves[r.id] === 'up' ? 'mover-up' : moves[r.id] === 'down' ? 'mover-down' : ''}`}>
                      <td><strong>#{r.rank}</strong></td>
                      <td>{r.name}</td>
                      <td><span className="badge primary">{r.kind}</span></td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.score}</td>
                      {momentumEnabled && (
                        <td style={{ textAlign: 'center' }}>
                          {onFire && <span style={{ fontSize: '1.5rem', animation: 'pulse 1s infinite' }}>🔥</span>}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
