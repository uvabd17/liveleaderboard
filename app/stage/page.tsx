'use client';

import React from 'react';

type Row = { id: string; name: string; score: number; rank: number; kind: 'team' | 'individual' };

type EventPayload =
  | { type: 'snapshot'; leaderboard: Row[] }
  | { type: 'leaderboard'; leaderboard: Row[]; movers: { id: string; from: number; to: number }[] }
  | { type: 'round-change'; currentRound: number; roundsConfig: any[] };

export default function StageDisplayPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [moves, setMoves] = React.useState<Record<string, 'up' | 'down' | undefined>>({});
  const [currentRound, setCurrentRound] = React.useState(0);
  const [roundName, setRoundName] = React.useState('');
  const [roundDuration, setRoundDuration] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(0);

  React.useEffect(() => {
    const es = new EventSource('/api/sse');
    es.onmessage = (ev) => {
      const payload: EventPayload = JSON.parse(ev.data);
      if (payload.type === 'snapshot') {
        setRows(payload.leaderboard);
        setMoves({});
      } else if (payload.type === 'leaderboard') {
        const movement: Record<string, 'up' | 'down' | undefined> = {};
        for (const m of payload.movers) {
          if (m.from === m.to) continue;
          movement[m.id] = m.to < m.from ? 'up' : 'down';
        }
        setMoves(movement);
        setRows(payload.leaderboard);
        setTimeout(() => setMoves({}), 1000);
      } else if (payload.type === 'round-change') {
        setCurrentRound(payload.currentRound);
        const rc = payload.roundsConfig[payload.currentRound];
        if (rc) {
          setRoundName(rc.name);
          setRoundDuration(rc.durationMinutes * 60);
          setTimeLeft(rc.durationMinutes * 60);
        }
      }
    };
    fetch('/api/rounds')
      .then((r) => r.json())
      .then((d) => {
        if (d.rounds.length > 0) {
          setCurrentRound(d.currentRound ?? 0);
          const rc = d.rounds[d.currentRound ?? 0];
          if (rc) {
            setRoundName(rc.name);
            setRoundDuration(rc.durationMinutes * 60);
            setTimeLeft(rc.durationMinutes * 60);
          }
        }
      })
      .catch(() => {});
    return () => es.close();
  }, []);

  React.useEffect(() => {
    if (roundDuration === 0 || timeLeft === 0) return;
    const timer = setTimeout(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, roundDuration]);

  const topRows = rows.slice(0, 10);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b1221 0%, #1a2744 100%)',
        padding: '3rem',
        color: '#fff',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1
          style={{
            fontSize: '5rem',
            margin: 0,
            background: 'linear-gradient(135deg, #59d1ff, #5ee6a4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textShadow: '0 0 40px rgba(89, 209, 255, 0.3)',
          }}
        >
          Live Leaderboard
        </h1>
        {roundName && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '2rem', color: '#5ee6a4', marginBottom: '0.5rem' }}>
              Round {currentRound + 1}: {roundName}
            </div>
            <div
              style={{
                fontSize: '4rem',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
                color: timeLeft <= 60 ? '#ff6b6b' : '#59d1ff',
              }}
            >
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {topRows.map((r, idx) => {
          const isTop3 = r.rank <= 3;
          const bgColor = isTop3
            ? r.rank === 1
              ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 237, 78, 0.2))'
              : r.rank === 2
              ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.3), rgba(232, 232, 232, 0.2))'
              : 'linear-gradient(135deg, rgba(205, 127, 50, 0.3), rgba(232, 168, 124, 0.2))'
            : 'linear-gradient(135deg, rgba(18, 26, 46, 0.8), rgba(18, 26, 46, 0.6))';

          return (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2rem 3rem',
                marginBottom: '1.5rem',
                background: bgColor,
                border: isTop3 ? '3px solid rgba(255, 215, 0, 0.5)' : '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                transition: 'all 0.5s ease',
                animation: moves[r.id] ? 'stageHighlight 1s ease' : undefined,
                boxShadow: isTop3 ? '0 8px 32px rgba(255, 215, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
                <div
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    color: isTop3 ? '#ffd700' : '#59d1ff',
                  }}
                >
                  #{r.rank}
                  {moves[r.id] === 'up' && (
                    <span style={{ marginLeft: '1rem', color: '#5ee6a4', fontSize: '3rem' }}>↑</span>
                  )}
                  {moves[r.id] === 'down' && (
                    <span style={{ marginLeft: '1rem', color: '#ff6b6b', fontSize: '3rem' }}>↓</span>
                  )}
                </div>
                <div style={{ fontSize: '3rem', flex: 1 }}>{r.name}</div>
              </div>
              <div
                style={{
                  fontSize: '4rem',
                  fontWeight: 'bold',
                  color: isTop3 ? '#ffd700' : '#5ee6a4',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '200px',
                  textAlign: 'right',
                }}
              >
                {r.score}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes stageHighlight {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 8px 48px rgba(94, 230, 164, 0.5);
          }
        }
      `}</style>
    </div>
  );
}
