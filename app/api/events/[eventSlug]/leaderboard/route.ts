import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSetWithSWR } from '@/lib/server-cache'

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

    // Fetch event rules early so cache key includes leaderboard mode and to avoid duplicate event fetches
    const evtFull = await db.event.findUnique({ where: { slug: eventSlug }, select: { id: true, rules: true, currentRound: true, name: true, slug: true, logoUrl: true, brandColors: true, organization: { select: { name: true } } } })
    const rules = (evtFull?.rules || {}) as any
    const mode = (rules && rules.leaderboardMode) || 'score'

    const cacheKey = `${eventSlug}:${page}:${size}:${mode}`

    // Use centralized server cache with stale-while-revalidate behavior
    const CACHE_TTL = Number(process.env.LEADERBOARD_CACHE_MS) || 15000
    // computeLeaderboard uses evtFull captured above
    async function computeLeaderboard() {
      const event = evtFull
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

    // Use cache with SWR semantics; route still provides a fast fallback if compute takes too long.
    // Race: prefer cached / background-refresh via getOrSetWithSWR, but if not present, fall back to timed compute for quick top-N.
    let cachedOrComputed: any = null
    try {
      const useCache = String(process.env.ENABLE_LEADERBOARD_CACHE || 'true') === 'true'
      if (useCache) {
        // Race between cache/SWR compute and fallback timeout
        cachedOrComputed = await Promise.race([
          (async () => await getOrSetWithSWR(cacheKey, computeLeaderboard, CACHE_TTL))(),
          new Promise((res) => setTimeout(() => res({ __fallback: true }), FALLBACK_TIMEOUT_MS))
        ])
      } else {
        // No caching: compute but still respect fallback timeout for fast responses
        cachedOrComputed = await Promise.race([
          computeLeaderboard(),
          new Promise((res) => setTimeout(() => res({ __fallback: true }), FALLBACK_TIMEOUT_MS))
        ])
      }
    } catch (e) {
      cachedOrComputed = { __fallback: true }
    }

    if (cachedOrComputed && (cachedOrComputed as any).__fallback) {
      try {
        const event = evtFull
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
        // background refresh handled by getOrSetWithSWR when called next time; still return fallback immediately
        return NextResponse.json(fallbackResp)
      } catch (e) {
        console.error('Fallback failed:', e)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
      }
    }
    // Successful compute (or cached) returned from getOrSetWithSWR
    return NextResponse.json(cachedOrComputed)
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
