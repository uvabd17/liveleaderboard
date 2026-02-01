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
  tokens: Map<string, RegisterToken>
  _coalesce?: Map<string, any>
  _lastSnapshot?: string

  subscribe: (send: (payload: any) => void, close: () => void, eventSlug?: string) => () => void
  broadcast: (event: string, data: any, fromRemote?: boolean) => void
  broadcastRoundChange: (data: any) => void
  seed: () => void
  loadFromDbIfEmpty: () => Promise<void>

  upsertParticipant: (p: Participant) => void
  _upsertLocalParticipant: (p: Participant) => void

  updateScore: (id: string, delta: number) => void
  _updateLocalScore: (id: string, delta: number) => void

  getSorted: () => Participant[]
  getRanks: () => Map<string, number>
  getSnapshot: (topN?: number, eventSlug?: string) => { type: 'snapshot'; leaderboard: Array<Participant & { rank: number }> }
  createRegisterToken: () => RegisterToken
  registerWithToken: (token: string, name: string, kind: 'team' | 'individual') => Participant | null
}


const TOP_N = Number(process.env.HUB_TOP_N) || 20
const DEBOUNCE_MS = Number(process.env.HUB_DEBOUNCE_MS) || 75
const INSTANCE_ID = process.env.HUB_INSTANCE_ID || makeId('ins')

let redisPub: any = null
let redisSub: any = null

// Setup Redis if available
try {
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    console.warn('[hub] WARNING: REDIS_URL not set in production. Using in-memory hub (non-scalable).')
  }
  if (process.env.REDIS_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis')
    const redisOptions = {
      maxRetriesPerRequest: 0,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      connectTimeout: 2000,
    }
    redisPub = new IORedis(process.env.REDIS_URL, redisOptions)
    redisSub = new IORedis(process.env.REDIS_URL, redisOptions)

    redisPub.on('error', () => { })
    redisSub.on('error', () => { })

    redisSub.subscribe('hub:sync')
    redisSub.on('message', (ch: string, msg: string) => {
      try {
        const payload = JSON.parse(msg)
        if (payload && payload.instanceId === INSTANCE_ID) return

        // Handle State Sync Commands (Update local state, triggering local broadcast)
        if (payload.type === 'SYNC:SCORE') {
          (g.__LEADERBOARD_HUB__ as any)?._updateLocalScore(payload.id, payload.delta)
        } else if (payload.type === 'SYNC:PARTICIPANT') {
          // preserve createdAt if remote has it
          (g.__LEADERBOARD_HUB__ as any)?._upsertLocalParticipant(payload.participant)
        } else {
          // Forward other control events (round-change, etc) to local subscribers
          // BUT ignore leaderboard/snapshot payloads to avoid double-processing
          if (payload.type !== 'leaderboard' && payload.type !== 'snapshot') {
            (g.__LEADERBOARD_HUB__ as any)?.broadcast(payload.type, payload, true) // true = fromRemote
          }
        }
      } catch (e) { }
    })
  }
} catch (e) { }

function rank(participants: Participant[]): Array<Participant & { rank: number }> {
  const sorted = [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
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
      // Send initial snapshot immediately
      try {
        const snap = hub.getSnapshot(TOP_N, eventSlug)
        send({ ...snap, eventSlug: eventSlug ?? null })
      } catch (err) { }
      return () => {
        if (this.subscribers.has(id)) this.subscribers.delete(id)
      }
    },

    // Broadcast to LOCAL subscribers
    broadcast(event, data, fromRemote = false) {
      const payload = { type: event, ...data }

      // If this is a control event generated locally, publish to Redis so others see it
      if (!fromRemote && redisPub && event !== 'leaderboard' && event !== 'snapshot') {
        redisPub.publish('hub:sync', JSON.stringify({ ...payload, instanceId: INSTANCE_ID })).catch(() => { })
      }

      for (const s of this.subscribers.values()) {
        if ((s as any).eventSlug && data.eventSlug && (s as any).eventSlug !== data.eventSlug) continue
        try { s.send(payload) } catch { }
      }
    },

    broadcastRoundChange(data) {
      this.broadcast('round-change', data)
    },

    seed() {
      if (this.state.participants.size > 0 || process.env.DATABASE_URL) return
      const now = Date.now()
      const initial = [
        { id: makeId('t'), name: 'Alpha Team', score: 42, kind: 'team' as const },
        { id: makeId('t'), name: 'Beta Builders', score: 36, kind: 'team' as const },
        { id: makeId('i'), name: 'Charlie', score: 30, kind: 'individual' as const },
      ]
      for (const p of initial) this.upsertParticipant({ ...p, createdAt: now })
    },

    async loadFromDbIfEmpty() {
      if (this.state.participants.size > 0) return
      try {
        const { prisma } = await import('./db')
        // Load ALL participants into memory (scalable up to ~50k in serverless memory limits)
        const rows = await prisma.participant.findMany({
          select: { id: true, name: true, totalScore: true, kind: true, createdAt: true, eventId: true }
        })
        const now = Date.now()
        for (const r of rows) {
          const p: Participant = {
            id: r.id,
            name: r.name,
            score: r.totalScore,
            kind: r.kind as any,
            createdAt: r.createdAt ? new Date(r.createdAt).getTime() : now,
          }
          this._upsertLocalParticipant(p)
        }
      } catch { }
    },

    // Public Method: Updates local state AND publishes sync command
    upsertParticipant(p) {
      this._upsertLocalParticipant(p)
      if (redisPub) {
        redisPub.publish('hub:sync', JSON.stringify({
          type: 'SYNC:PARTICIPANT',
          participant: p,
          instanceId: INSTANCE_ID
        })).catch(() => { })
      }
    },

    // Internal Method: Update logic without publishing
    _upsertLocalParticipant(p: Participant) {
      this.state.participants.set(p.id, p)
      const ranked = rank(Array.from(this.state.participants.values()))
      this.state.lastRanks = new Map(ranked.map(r => [r.id, r.rank]))

      const trimmed = ranked.slice(0, TOP_N)
      const current = JSON.stringify(trimmed)
      if ((this as any)._lastSnapshot !== current) {
        (this as any)._lastSnapshot = current
        this.broadcast('snapshot', { leaderboard: trimmed }, true) // "fromRemote=true" prevents re-publish
      }
    },

    // Coalescing map for debounce
    _coalesce: new Map(),

    // Public Method: Update score
    updateScore(id, delta) {
      this._updateLocalScore(id, delta)
      if (redisPub) {
        redisPub.publish('hub:sync', JSON.stringify({
          type: 'SYNC:SCORE',
          id,
          delta,
          instanceId: INSTANCE_ID
        })).catch(() => { })
      }
    },

    // Internal Method
    _updateLocalScore(id: string, delta: number) {
      const p = this.state.participants.get(id)
      if (!p) return
      p.score = Math.max(0, p.score + delta)
      this.state.participants.set(id, p)

      const existing = (this as any)._coalesce.get(id)
      if (existing && existing.timer) clearTimeout(existing.timer)

      // Debounce the recalculation and broadcast
      const tmr = setTimeout(() => {
        try {
          const before = this.state.lastRanks
          const ranked = rank(Array.from(this.state.participants.values()))
          const after = new Map(ranked.map(r => [r.id, r.rank]))
          this.state.lastRanks = after

          const movers = ranked.filter(r => before.get(r.id) !== r.rank)
            .map(r => ({ id: r.id, from: before.get(r.id) ?? r.rank, to: r.rank }))

          // Broadcast to local clients. Mark as "fromRemote" so we don't try to publish 'leaderboard' to Redis
          // (We rely on SYNC:SCORE for that)
          if (movers.length > 0 || delta !== 0) {
            const trimmed = ranked.slice(0, TOP_N)
            this.broadcast('leaderboard', { leaderboard: trimmed, movers }, true)
          }
        } catch (err) { }
        (this as any)._coalesce.delete(id)
      }, DEBOUNCE_MS)

        ; (this as any)._coalesce.set(id, { timer: tmr })
    },

    getSorted() { return Array.from(this.state.participants.values()).sort((a, b) => b.score - a.score) },
    getRanks() { return this.state.lastRanks },
    getSnapshot(topN?: number, eventSlug?: string) {
      // In a real app we might filter by eventSlug here from the big map
      const all = Array.from(this.state.participants.values())
      // Optimization: if eventSlug provided, filter first? 
      // Current demo hub shares memory across all events.
      // Ideally check p.eventId == eventSlug if we had it.
      // For now, assume single event or global ID uniqueness.
      const ranked = rank(all)
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
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    hub.seed()
  }
  g.__LEADERBOARD_HUB__ = hub
}

export const hub: Hub = (globalThis as any).__LEADERBOARD_HUB__
