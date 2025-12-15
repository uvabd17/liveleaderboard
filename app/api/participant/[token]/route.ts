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

    // Find participant by access token in profile
    // Note: Prisma JSON filtering is limited, so we fetch and filter
    // TODO: Optimize with separate ParticipantToken table or JSONB index
    // For now, we fetch all participants - this is inefficient but works
    // In production with 500+ participants, this should be optimized
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

    // Calculate total score using aggregation (optimized)
    const scoreAgg = await db.score.aggregate({
      where: { eventId: participant.eventId, participantId: participant.id },
      _sum: { value: true }
    })
    const totalScore = scoreAgg._sum.value ?? 0

    // Get leaderboard position (optimized)
    const eventParticipants = await db.participant.findMany({
      where: { eventId: participant.eventId },
      select: { id: true, name: true }
    })

    const ranked = await Promise.all(
      eventParticipants.map(async (p) => {
        const pScoreAgg = await db.score.aggregate({
          where: { eventId: participant.eventId, participantId: p.id },
          _sum: { value: true }
        })
        return {
          id: p.id,
          name: p.name,
          totalScore: pScoreAgg._sum.value ?? 0,
        }
      })
    )

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

