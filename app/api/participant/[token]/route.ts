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
    const participantsList = await db.participant.findMany({
      include: {
        event: {
          include: {
            organization: true,
          },
        },
        scores: true,
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

    // Calculate total score
    const totalScore = participant.scores.reduce((sum, score) => sum + score.value, 0)

    // Get leaderboard position
    const eventParticipants = await db.participant.findMany({
      where: { eventId: participant.eventId },
      include: { scores: true },
    })

    const ranked = eventParticipants
      .map(p => ({
        id: p.id,
        name: p.name,
        totalScore: p.scores.reduce((sum, s) => sum + s.value, 0),
      }))
      .sort((a, b) => {
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

