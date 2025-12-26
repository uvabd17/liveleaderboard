import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }


    // Find participant by access token in profile (still needs optimization for large scale)
    const participantsList = await db.participant.findMany({
      include: {
        event: {
          include: {
            organization: true,
          },
        },
      },
    })
    const participants = participantsList.filter(p => {
      const profile = p.profile as any
      return profile && profile.accessToken === token
    })
    if (participants.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }
    const participant = participants[0]

    // Use a single groupBy query to get all participant scores for ranking
    const scoreGroups = await db.score.groupBy({
      by: ['participantId'],
      where: { eventId: participant.eventId },
      _sum: { value: true },
    })
    // Map participantId to totalScore
    const scoreMap = new Map<string, number>()
    scoreGroups.forEach(g => {
      scoreMap.set(g.participantId, g._sum.value ?? 0)
    })
    const totalScore = scoreMap.get(participant.id) ?? 0

    // Get all participants for the event (names for sorting)
    const eventParticipants = await db.participant.findMany({
      where: { eventId: participant.eventId },
      select: { id: true, name: true },
    })
    // Build ranked list
    const ranked = eventParticipants.map(p => ({
      id: p.id,
      name: p.name,
      totalScore: scoreMap.get(p.id) ?? 0,
    }))
    ranked.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      return a.name.localeCompare(b.name)
    })
    const rank = ranked.findIndex(p => p.id === participant.id) + 1

    return NextResponse.json({
      participant: {
        id: participant.id,
        name: participant.name,
        kind: participant.kind,
        profile: participant.profile,
        event: {
          id: participant.event.id,
          name: participant.event.name,
          slug: participant.event.slug,
          description: participant.event.description,
          startAt: participant.event.startAt,
          endAt: participant.event.endAt,
          organization: {
            name: participant.event.organization.name,
          },
        },
        totalScore,
        rank,
      },
    })
  } catch (error) {
    console.error('Failed to fetch participant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

