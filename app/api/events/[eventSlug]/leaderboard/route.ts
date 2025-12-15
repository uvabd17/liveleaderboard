import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple leaderboard cache: prefer Redis when REDIS_URL is set, otherwise in-memory
const CACHE_TTL_MS = Number(process.env.LEADERBOARD_CACHE_MS) || 100
const LEADERBOARD_CACHE: Map<string, { expires: number; data: any }> = new Map()
const REVALIDATING: Set<string> = new Set()
let redisClient: any = null
try {
  if (process.env.REDIS_URL) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis')
    redisClient = new IORedis(process.env.REDIS_URL)
  }
} catch (e) {
  // ignore - continue with in-memory cache
}

async function cacheGet(key: string) {
  if (redisClient) {
    try {
      const s = await redisClient.get(`lb:${key}`)
      if (!s) return null
      return JSON.parse(s)
    } catch (e) {
      return null
    }
  }
  const entry = LEADERBOARD_CACHE.get(key)
  if (!entry) return null
  if (entry.expires <= Date.now()) {
    LEADERBOARD_CACHE.delete(key)
    return null
  }
  return entry.data
}

async function cacheSet(key: string, data: any, ttl = CACHE_TTL_MS) {
  if (redisClient) {
    try {
      await redisClient.set(`lb:${key}`, JSON.stringify(data), 'PX', String(ttl))
      return
    } catch (e) {
      // ignore and fallback to in-memory
    }
  }
  LEADERBOARD_CACHE.set(key, { expires: Date.now() + ttl, data })
}

// Fast fallback params: if compute takes longer than this, return a trimmed top-N quickly
const FALLBACK_TIMEOUT_MS = Number(process.env.LEADERBOARD_FALLBACK_MS) || 200
const FALLBACK_TOP = Number(process.env.LEADERBOARD_FALLBACK_TOP) || 10

export async function GET(
  req: Request,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const { eventSlug } = params
    const url = new URL(req.url)
    const page = Number(url.searchParams.get('page') || '1')
    const size = Number(url.searchParams.get('size') || '200')

    // Fetch event rules early so cache key includes leaderboard mode
    const evtFull = await db.event.findUnique({ where: { slug: eventSlug }, select: { rules: true, currentRound: true } })
    const rules = (evtFull?.rules || {}) as any
    const mode = (rules && rules.leaderboardMode) || 'score'

    const cacheKey = `${eventSlug}:${page}:${size}:${mode}`
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(cached)

    const now = Date.now()

    // Helper to compute the leaderboard payload
    async function computeLeaderboard() {
      const event = await db.event.findUnique({
        where: { slug: eventSlug },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          brandColors: true,
          organization: { select: { name: true } }
        }
      })

      if (!event) throw new Error('Event not found')

      const start = Math.max(0, (page - 1) * size)
      const totalCountRes: any = await db.$queryRaw`
        SELECT COUNT(*)::int as count
        FROM "Participant"
        WHERE "eventId" = ${event.id}
      `
      const total = (totalCountRes && totalCountRes[0] && Number(totalCountRes[0].count)) || 0

      const participantsWithScores = await db.participant.findMany({
        where: { eventId: event.id },
        orderBy: { totalScore: 'desc' },
        take: size,
        skip: start,
        select: { id: true, name: true, kind: true, totalScore: true }
      })

      const normalizedParticipants = participantsWithScores.map((p: any) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        totalScore: Number(p.totalScore || 0),
        rank: 0,
        previousRank: 0,
        momentum: 0
      }))

      const durationMap: Record<string, number> = {}
      if (mode === 'speed+score') {
        const currentRound = Number(evtFull?.currentRound ?? 0)
        const completions = await db.roundCompletion.findMany({ where: { eventId: event.id }, select: { participantId: true, roundNumber: true, durationSeconds: true } })
        for (const c of completions) {
          if (c.durationSeconds == null) continue
          if (c.roundNumber > currentRound) continue
          durationMap[c.participantId] = (durationMap[c.participantId] || 0) + (c.durationSeconds || 0)
        }
        normalizedParticipants.sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
          const da = durationMap[a.id] || Infinity
          const dbv = durationMap[b.id] || Infinity
          return da - dbv
        })
      }

      const pageItems = normalizedParticipants.map((p: any, i: number) => ({ ...p, rank: (page - 1) * size + i + 1 }))
      return { event, participants: pageItems, total }
    }

    // If cache exists but expired (in-memory only case) return stale and trigger background refresh
    if (!redisClient) {
      const inMem = LEADERBOARD_CACHE.get(cacheKey)
      if (inMem && inMem.expires <= now) {
        if (!REVALIDATING.has(cacheKey)) {
          REVALIDATING.add(cacheKey)
          computeLeaderboard()
            .then((res) => cacheSet(cacheKey, res))
            .catch(() => {})
            .finally(() => REVALIDATING.delete(cacheKey))
        }
        return NextResponse.json(inMem.data)
      }
    }

    // No cache: compute but race with a short timeout to provide a fast trimmed fallback if needed.
    let computed: any = null
    try {
      computed = await Promise.race([
        computeLeaderboard(),
        new Promise((res) => setTimeout(() => res({ __fallback: true }), FALLBACK_TIMEOUT_MS))
      ])
    } catch (e) {
      computed = { __fallback: true }
    }

    if (computed && (computed as any).__fallback) {
      try {
        const event = await db.event.findUnique({ where: { slug: eventSlug }, select: { id: true, name: true, slug: true, logoUrl: true, brandColors: true, organization: { select: { name: true } } } })
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

        const top = await db.participant.findMany({ where: { eventId: event.id }, orderBy: { totalScore: 'desc' }, take: FALLBACK_TOP, select: { id: true, name: true, kind: true, totalScore: true } })
        const normalized = top.map((p: any, i: number) => ({ id: p.id, name: p.name, kind: p.kind, totalScore: Number(p.totalScore || 0), rank: i + 1 }))
        const totalCountRes: any = await db.$queryRaw`
          SELECT COUNT(*)::int as count
          FROM "Participant"
          WHERE "eventId" = ${event.id}
        `
        const total = (totalCountRes && totalCountRes[0] && Number(totalCountRes[0].count)) || 0
        const fallbackResp = { event, participants: normalized, total, partial: true }

        // trigger background full compute to refresh cache
        if (!REVALIDATING.has(cacheKey)) {
          REVALIDATING.add(cacheKey)
          computeLeaderboard()
            .then((res) => cacheSet(cacheKey, res))
            .catch(() => {})
            .finally(() => REVALIDATING.delete(cacheKey))
        }

        return NextResponse.json(fallbackResp)
      } catch (e) {
        console.error('Fallback failed:', e)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
      }
    }

    // Successful fast compute within timeout: cache and return
    await cacheSet(cacheKey, computed)
    return NextResponse.json(computed)
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
