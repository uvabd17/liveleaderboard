import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { eventSlug: string; participantId: string } }
) {
  try {
    const { eventSlug, participantId } = params

    const event = await db.event.findUnique({ where: { slug: eventSlug } })
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const scores = await db.score.findMany({
      where: {
        eventId: event.id,
        participantId
      },
      orderBy: [
        { criterion: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        criterion: true,
        value: true,
        comment: true,
        judgeUserId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ scores })
  } catch (error: any) {
    console.error('Failed to fetch participant scores:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

