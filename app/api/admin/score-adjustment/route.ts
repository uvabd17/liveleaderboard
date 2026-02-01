import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { hub } from '@/lib/hub'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST(request: Request) {
  // Build-time safety check
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ message: 'Build phase' })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { eventSlug, participantId, criterion, newValue, reason } = body as {
      eventSlug: string
      participantId: string
      criterion: string
      newValue: number
      reason?: string
    }

    if (!eventSlug || !participantId || !criterion || typeof newValue !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Verify admin access
    const event = await db.event.findUnique({
      where: { slug: eventSlug },
      include: { organization: true }
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const userId = session.user.id as string
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { ownedOrgs: true }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isOwner = event.organization.ownerId === userId
    const isOrgMember = user.orgId === event.orgId || user.ownedOrgs.some(org => org.id === event.orgId)
    if (!isOwner && !isOrgMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Check if ALL rounds are completed for ALL participants
    const rules = (event.rules || {}) as any
    const roundsConfig = Array.isArray(rules.rounds) ? rules.rounds : []
    const totalRounds = roundsConfig.length

    if (totalRounds === 0) {
      return NextResponse.json({
        error: 'no_rounds_configured',
        message: 'No rounds configured. Score adjustments can only be made after all rounds are completed.'
      }, { status: 400 })
    }

    // Get all participants
    const allParticipants = await db.participant.findMany({
      where: { eventId: event.id },
      select: { id: true }
    })

    // Check completions for all participants and all rounds
    for (const participant of allParticipants) {
      for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
        const completion = await db.roundCompletion.findUnique({
          where: {
            eventId_participantId_roundNumber: {
              eventId: event.id,
              participantId: participant.id,
              roundNumber: roundNum
            }
          }
        })
        if (!completion) {
          return NextResponse.json({
            error: 'rounds_not_all_completed',
            message: `Cannot adjust scores yet. Round ${roundNum} is not completed for participant ${participant.id}. All rounds must be completed for all participants before score adjustments are allowed.`
          }, { status: 403 })
        }
      }
    }

    // Find the score to adjust
    const existingScore = await db.score.findFirst({
      where: {
        eventId: event.id,
        participantId,
        criterion
      }
    })

    if (!existingScore) {
      return NextResponse.json({ error: 'Score not found' }, { status: 404 })
    }

    const oldValue = existingScore.value

    // Update the score
    await db.score.update({
      where: { id: existingScore.id },
      data: {
        value: Math.floor(newValue),
        updatedAt: new Date(),
        comment: existingScore.comment
          ? `${existingScore.comment}\n[ADJUSTED by ${user.name || user.email} at ${new Date().toISOString()}: ${oldValue} → ${newValue}${reason ? ` - Reason: ${reason}` : ''}]`
          : `[ADJUSTED by ${user.name || user.email} at ${new Date().toISOString()}: ${oldValue} → ${newValue}${reason ? ` - Reason: ${reason}` : ''}]`
      }
    })

    // Create audit log entry
    try {
      await db.auditLog.create({
        data: {
          eventId: event.id,
          userId: user.id,
          action: 'score_adjust',
          entityType: 'Score',
          entityId: existingScore.id,
          details: {
            participantId,
            criterion,
            oldValue,
            newValue: Math.floor(newValue),
            reason: reason || null
          }
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    // Broadcast leaderboard update
    const participants = await db.participant.findMany({
      where: { eventId: event.id },
      select: { id: true, name: true, kind: true }
    })

    const leaderboard = await Promise.all(
      participants.map(async (p) => {
        const scoreAgg = await db.score.aggregate({
          where: { eventId: event.id, participantId: p.id },
          _sum: { value: true }
        })
        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          score: scoreAgg._sum.value ?? 0,
          rank: 0
        }
      })
    )

    leaderboard.sort((a, b) => b.score - a.score)
    leaderboard.forEach((p, index) => { p.rank = index + 1 })

    hub.broadcast('leaderboard', {
      eventSlug,
      leaderboard,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Score adjusted successfully',
      oldValue,
      newValue: Math.floor(newValue)
    })
  } catch (error: any) {
    console.error('Score adjustment error:', error)
    return NextResponse.json({
      error: 'Failed to adjust score',
      message: error?.message
    }, { status: 500 })
  }
}
