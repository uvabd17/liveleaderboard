import { prisma } from '../../../../lib/db'
import { EventFeatures, mergeFeatures } from '@/lib/features'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const eventSlug = url.searchParams.get('eventSlug')
    if (!eventSlug) {
      return Response.json({ error: 'eventSlug required' }, { status: 400 })
    }
    const evt = await prisma.event.findUnique({ where: { slug: eventSlug } })
    if (!evt) return Response.json({ error: 'no_event' }, { status: 404 })

    const rules = (evt?.rules as any) || {}
    const features = mergeFeatures(evt.features as Partial<EventFeatures> | null)

    return Response.json({
      judgingMode: rules.judgingMode ?? 'aggregateVisible',
      features,
      rules,
      eventSlug,
    })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await request.json()
    const { judgingMode, rules, eventSlug } = body as { judgingMode?: 'blinded' | 'aggregateVisible'; rules?: any; eventSlug?: string }
    const slug = eventSlug
    if (!slug) {
      return Response.json({ error: 'eventSlug required' }, { status: 400 })
    }
    const evt = await prisma.event.findUnique({ where: { slug }, include: { organization: true } })
    if (!evt) return Response.json({ error: 'no_event' }, { status: 404 })

    // Permission: must be org owner or belong to the same org
    const uid = session.user.id as string
    const isOwner = evt.organization?.ownerId === uid
    const sameOrg = session.user.orgId && session.user.orgId === evt.orgId
    if (!isOwner && !sameOrg) return Response.json({ error: 'forbidden' }, { status: 403 })

    const newRules = { ...(evt.rules as any || {}), ...(rules || {}), ...(judgingMode ? { judgingMode } : {}) }
    await prisma.event.update({ where: { id: evt.id }, data: { rules: newRules } })
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { features, rules, eventSlug } = body

    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

    const slug = eventSlug
    if (!slug) {
      return Response.json({ error: 'eventSlug required' }, { status: 400 })
    }
    const evt = await prisma.event.findUnique({ where: { slug }, include: { organization: true } })
    if (!evt) return Response.json({ error: 'Event not found' }, { status: 404 })

    const uid = session.user.id as string
    const isOwner = evt.organization?.ownerId === uid
    const sameOrg = session.user.orgId && session.user.orgId === evt.orgId
    if (!isOwner && !sameOrg) return Response.json({ error: 'forbidden' }, { status: 403 })

    const updateData: any = {}
    if (features !== undefined) updateData.features = features
    if (rules !== undefined) {
      // Merge with existing rules
      updateData.rules = { ...(evt.rules as any || {}), ...rules }
    }

    const updated = await prisma.event.update({
      where: { slug },
      data: updateData,
    })

    return Response.json({ success: true, features: updated.features, rules: updated.rules })
  } catch (error) {
    console.error('Failed to update event settings:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
