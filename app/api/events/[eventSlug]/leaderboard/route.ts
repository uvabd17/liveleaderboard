import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const { eventSlug } = params

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

    // Fetch participants with scores
    const participants = await db.participant.findMany({
      where: { eventId: event.id },
      include: {
        scores: {
          select: { value: true }
        }
      }
    })

    // Calculate total scores and ranks
    const participantsWithScores = participants.map(p => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      totalScore: p.scores.reduce((sum, score) => sum + score.value, 0),
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

    // Sort by total score descending (and by total duration ascending when speed+score)
    participantsWithScores.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      if (mode === 'speed+score') {
        const da = durationMap[a.id] || Infinity
        const dbv = durationMap[b.id] || Infinity
        return da - dbv
      }
      return 0
    })

    // Assign ranks
    participantsWithScores.forEach((p, index) => {
      p.rank = index + 1
    })

    return NextResponse.json({
      event,
      participants: participantsWithScores
    })
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
