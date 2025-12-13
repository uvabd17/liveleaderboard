import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { eventSlug } = params

    const event = await db.event.findUnique({
      where: { slug: eventSlug },
      include: {
        organization: {
          select: { name: true, id: true }
        },
        judges: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            expiresAt: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            participants: true,
            judges: true,
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Allow public events to be fetched without authentication
    if (event.visibility === 'public') {
      return NextResponse.json({ event })
    }

    // Check if user owns this event for non-public events
    if (session?.user?.orgId !== event.organization.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}
