// Simple in-memory hub for demo purposes only.
// Holds participants, tokens, and SSE subscribers. Not for production use.

export type Participant = {
  id: string
  name: string
  score: number
  kind: 'team' | 'individual'
  createdAt: number
}

type LeaderboardState = {
  participants: Map<string, Participant>
  lastRanks: Map<string, number>
}

type Subscriber = {
  id: string
  send: (payload: any) => void
  close: () => void
}

type RegisterToken = { token: string; createdAt: number; used: boolean }

type Hub = {
  state: LeaderboardState
  subscribers: Map<string, Subscriber>
  subscribe: (send: (payload: any) => void, close: () => void, eventSlug?: string) => () => void
  broadcast: (event: string, data: any) => void
  broadcastRoundChange: (data: any) => void
  seed: () => void
  loadFromDbIfEmpty: () => Promise<void>
  upsertParticipant: (p: Participant) => void
  updateScore: (id: string, delta: number) => void
  getSorted: () => Participant[]
  getRanks: () => Map<string, number>
  getSnapshot: () => { type: 'snapshot'; leaderboard: Array<Participant & { rank: number }> }
  createRegisterToken: () => RegisterToken
  registerWithToken: (token: string, name: string, kind: 'team' | 'individual') => Participant | null
  tokens: Map<string, RegisterToken>
}

const TOP_N = Number(process.env.HUB_TOP_N) || 50
const DEBOUNCE_MS = Number(process.env.HUB_DEBOUNCE_MS) || 150

function rank(participants: Participant[]): Array<Participant & { rank: number }>{
  const sorted = [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // tie-breaker: earlier created wins, then lexicographic name
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
    return a.name.localeCompare(b.name)
  })
  let currentRank = 1
  let lastScore = Infinity
  const ranked: Array<Participant & { rank: number }> = []
  for (const p of sorted) {
    if (p.score !== lastScore) {
      currentRank = ranked.length + 1
      lastScore = p.score
    }
    ranked.push({ ...p, rank: currentRank })
  }
  return ranked
}

function makeId(prefix = 'p'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const g = globalThis as any

if (!g.__LEADERBOARD_HUB__) {
  const hub: Hub = {
    state: { participants: new Map(), lastRanks: new Map() },
    subscribers: new Map(),
    tokens: new Map(),
    subscribe(send, close, eventSlug?: string) {
        const id = makeId('sub')
        const sub: Subscriber = { id, send, close, eventSlug } as any
      this.subscribers.set(id, sub)
      // send initial snapshot (include eventSlug so clients can filter)
      try {
          const snap = hub.getSnapshot(TOP_N, eventSlug)
          send({ ...snap, eventSlug: eventSlug ?? null })
      } catch (err) {
        try { send(hub.getSnapshot()) } catch {}
      }
      return () => {
        const s = this.subscribers.get(id)
        if (s) {
          this.subscribers.delete(id)
        }
      }
    },
      // pending broadcasts keyed by eventSlug (null for global)
      (async _flushPending(key: string | null) {}) as any,
      broadcast(event, data) {
        // For leaderboard events, debounce and trim to TOP_N to reduce payloads
        if (event === 'leaderboard') {
          try {
            const key = data?.eventSlug ?? '__all__'
            const map = (this as any)._pendingBroadcasts || new Map()
            map.set(key, { event, data })
            ;(this as any)._pendingBroadcasts = map
            if (!map.get(key)._timer) {
              map.get(key)._timer = setTimeout(() => {
                try {
                  const item = map.get(key)
                  map.delete(key)
                  if (!item) return
                  const payload = { type: item.event, ...item.data }
                  // trim leaderboard if present
                  if (Array.isArray(payload.leaderboard)) {
                    payload.leaderboard = payload.leaderboard.slice(0, TOP_N)
                  }
                  for (const s of this.subscribers.values()) {
                    if ((s as any).eventSlug && payload.eventSlug && (s as any).eventSlug !== payload.eventSlug) continue
                    try { s.send(payload) } catch {}
                  }
                } catch (err) {
                  // ignore
                }
              }, DEBOUNCE_MS)
            }
          } catch (err) {
            // fallback immediate send
            const payload = { type: event, ...data }
            for (const s of this.subscribers.values()) {
              if ((s as any).eventSlug && data.eventSlug && (s as any).eventSlug !== data.eventSlug) continue
              try { s.send(payload) } catch {}
            }
          }
          return
        }

        const payload = { type: event, ...data }
        for (const s of this.subscribers.values()) {
          // Filter by eventSlug if present
          if ((s as any).eventSlug && data.eventSlug && (s as any).eventSlug !== data.eventSlug) {
            continue
          }
          try { s.send(payload) } catch {}
        }
      },
    broadcastRoundChange(data) {
      // Use generic broadcast so event-scoped filtering applies
      this.broadcast('round-change', data)
    },
    seed() {
      if (this.state.participants.size > 0) return
      if (process.env.DATABASE_URL) return
      const now = Date.now()
      const initial = [
        { id: makeId('t'), name: 'Alpha Team', score: 42, kind: 'team' as const },
        { id: makeId('t'), name: 'Beta Builders', score: 36, kind: 'team' as const },
        { id: makeId('i'), name: 'Charlie', score: 30, kind: 'individual' as const },
        { id: makeId('t'), name: 'Delta Devs', score: 28, kind: 'team' as const },
      ]
      for (const p of initial) this.upsertParticipant({ ...p, createdAt: now + Math.floor(Math.random()*1000) })
    },
    async loadFromDbIfEmpty() {
      if (this.state.participants.size > 0) return
      try {
        const { prisma } = await import('./db')
        const evt = await prisma.event.findUnique({ where: { slug: 'demo-event' } })
        if (!evt) return
        const rows = await prisma.participant.findMany({ where: { eventId: evt.id }, orderBy: { createdAt: 'asc' } })
        const now = Date.now()
        for (const r of rows) {
          const p: Participant = {
            id: r.id,
            name: r.name,
            score: 0,
            kind: (r as any).kind === 'team' ? 'team' : 'individual',
            createdAt: (r as any).createdAt ? new Date((r as any).createdAt).getTime() : now,
          }
          this.upsertParticipant(p)
        }
      } catch {
        // ignore if prisma/db not available
      }
    },
    upsertParticipant(p) {
      this.state.participants.set(p.id, p)
      // update ranks cache
      const ranked = rank(Array.from(this.state.participants.values()))
      this.state.lastRanks = new Map(ranked.map(r => [r.id, r.rank]))
      // trim to TOP_N for snapshots
      const trimmed = ranked.slice(0, TOP_N)
      const current = JSON.stringify(trimmed)
      if ((this as any)._lastSnapshot !== current) {
        (this as any)._lastSnapshot = current
        this.broadcast('snapshot', { leaderboard: trimmed })
      }
    },
    updateScore(id, delta) {
      const p = this.state.participants.get(id)
      if (!p) return
      p.score = Math.max(0, p.score + delta)
      this.state.participants.set(id, p)
      const before = this.state.lastRanks
      const ranked = rank(Array.from(this.state.participants.values()))
      const after = new Map(ranked.map(r => [r.id, r.rank]))
      this.state.lastRanks = after
      // compute movers only for changed ranks
      const movers = ranked.filter(r => before.get(r.id) !== r.rank).map(r => ({ id: r.id, from: before.get(r.id) ?? r.rank, to: r.rank }))
      // throttle/batched broadcast: only broadcast trimmed leaderboard if there are changes
      if (movers.length > 0 || delta !== 0) {
        this.broadcast('leaderboard', { leaderboard: ranked, movers })
      }
    },
    getSorted() { return Array.from(this.state.participants.values()).sort((a,b)=>b.score-a.score) },
    getRanks() { return this.state.lastRanks },
    getSnapshot(topN?: number, eventSlug?: string) {
      const ranked = rank(Array.from(this.state.participants.values()))
      const trimmed = typeof topN === 'number' ? ranked.slice(0, topN) : ranked
      return { type: 'snapshot' as const, leaderboard: trimmed }
    },
    createRegisterToken() {
      const token = makeId('tok')
      const t = { token, createdAt: Date.now(), used: false }
      this.tokens.set(token, t)
      return t
    },
    registerWithToken(token, name, kind) {
      const t = this.tokens.get(token)
      if (!t || t.used) return null
      t.used = true
      this.tokens.set(token, t)
      const p: Participant = { id: makeId(kind === 'team' ? 't' : 'i'), name, score: 0, kind, createdAt: Date.now() }
      this.upsertParticipant(p)
      return p
    }
  }
  hub.seed()
  g.__LEADERBOARD_HUB__ = hub
}

export const hub: Hub = (globalThis as any).__LEADERBOARD_HUB__
