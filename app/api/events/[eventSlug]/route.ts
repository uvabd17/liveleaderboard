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

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user owns this event (is org member)
    if (session.user.orgId === event.organization.id) {
      return NextResponse.json({ event })
    }

    // Check if user is a judge for this event
    const isJudge = event.judges.some(j => j.email === session.user?.email)
    if (isJudge) {
      return NextResponse.json({ event })
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventSlug } = params
    const body = await req.json()

    const event = await db.event.findUnique({
      where: { slug: eventSlug },
      select: { orgId: true }
    })

    if (!event || event.orgId !== session.user.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.event.update({
      where: { slug: eventSlug },
      data: body
    })

    return NextResponse.json({ event: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
