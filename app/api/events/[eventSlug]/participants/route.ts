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
      select: { id: true }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const participants = await db.participant.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        name: true,
        kind: true,
        entries: {
          select: { roundNumber: true, url: true, notes: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ participants })
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const sessionModule = await import('next-auth')
    const { getServerSession } = sessionModule
    const { authOptions } = await import('@/lib/auth')

    const session = await getServerSession(authOptions as any)
    const sess = session as any
    if (!sess || !sess.user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { name, kind } = body as { name?: string; kind?: 'team' | 'individual' }
    if (!name || (kind !== 'team' && kind !== 'individual')) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    }

    const { eventSlug } = params
    const event = await db.event.findUnique({ where: { slug: eventSlug }, select: { id: true, orgId: true } })
    if (!event) return NextResponse.json({ error: 'event_not_found' }, { status: 404 })

    // Optional: check session.user.orgId matches event.orgId
    if (sess.user.orgId && sess.user.orgId !== event.orgId) {
      // not necessarily fatal — allow admins belonging to orgs only
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Check participant limit (100 for free tier)
    const participantCount = await db.participant.count({ where: { eventId: event.id } })
    if (participantCount >= 100) {
      return NextResponse.json({ error: 'participant_limit_reached', message: 'You have reached the maximum of 100 participants per event on the free tier. Please upgrade your plan.' }, { status: 429 })
    }

    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ')

    // Check duplicates
    const existing = await db.participant.findFirst({ where: { eventId: event.id, normalizedName, kind } })
    if (existing) return NextResponse.json({ error: 'duplicate_name' }, { status: 409 })

    // Generate access code for participant portal access
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let accessCode = ''
    for (let i = 0; i < 6; i++) {
      accessCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const created = await db.participant.create({ 
      data: { 
        eventId: event.id, 
        name: name.trim(), 
        normalizedName, 
        kind,
        accessCode 
      } 
    })

    return NextResponse.json({ ok: true, participant: created }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create participant:', error)
    return NextResponse.json({ error: error?.message || 'error' }, { status: 500 })
  }
}
