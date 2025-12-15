import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const { eventSlug } = params
    const url = new URL(req.url)
    const page = Number(url.searchParams.get('page') || '1')
    const size = Number(url.searchParams.get('size') || '200')

    const event = await db.event.findUnique({
      where: { slug: eventSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        brandColors: true,
        organization: {
          select: { name: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Efficiently fetch paginated participants with total scores using a single SQL query
    const start = Math.max(0, (page - 1) * size)
    // total participants count
    const totalCountRes: any = await db.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM "Participant"
      WHERE "eventId" = ${event.id}
    `
    const total = (totalCountRes && totalCountRes[0] && Number(totalCountRes[0].count)) || 0

    // Fetch page of participants using denormalized totalScore for fast reads
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
      momentum: 0,
    }))

    // Determine ranking mode from event.rules (default: score-only)
    const evtFull = await db.event.findUnique({ where: { slug: eventSlug }, select: { rules: true, currentRound: true } })
    const rules = (evtFull?.rules || {}) as any
    const mode = (rules && rules.leaderboardMode) || 'score'

    // If speed+score mode, gather round completion durations
    const durationMap: Record<string, number> = {}
    if (mode === 'speed+score') {
      const currentRound = Number(evtFull?.currentRound ?? 0)
      const completions = await db.roundCompletion.findMany({ where: { eventId: event.id }, select: { participantId: true, roundNumber: true, durationSeconds: true } })
      for (const c of completions) {
        if (c.durationSeconds == null) continue
        if (c.roundNumber > currentRound) continue
        durationMap[c.participantId] = (durationMap[c.participantId] || 0) + (c.durationSeconds || 0)
      }
    }

    // If speed+score mode, we need to factor duration into ordering. For now, if mode === 'speed+score',
    // fetch durations and adjust ordering in-memory for the current page.
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

    // Assign ranks (global rank is approximate when using pagination — for exact ranks across all participants,
    // a full ordering would be required; here we set ranks relative to the page slice start)
    const pageItems = normalizedParticipants.map((p: any, i: number) => ({ ...p, rank: (page - 1) * size + i + 1 }))

    return NextResponse.json({
      event,
      participants: pageItems,
      total
    })
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
