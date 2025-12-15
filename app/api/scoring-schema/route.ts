import { prisma } from '../../../lib/db'
import { hub } from '../../../lib/hub'
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
    const rules = (evt?.rules as any) || {}
    const rubric = (rules.rubric || [
      { key: 'innovation', label: 'Innovation', max: 100, weight: 1 },
      { key: 'impact', label: 'Impact', max: 100, weight: 1 },
      { key: 'technical', label: 'Technical', max: 100, weight: 1 },
    ]).map((r: any) => ({
      ...r,
      description: r.description ?? '',
      rounds: Array.isArray(r.rounds) ? r.rounds : null,
      required: r.required ?? true,
      scale: r.scale ?? 'number',
    }))
    return Response.json({ rubric })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // require authenticated owner/member
    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) return Response.json({ error: 'unauthenticated' }, { status: 401 })
    const body = await request.json()
    const { rubric, eventSlug } = body as { rubric: { key: string; label: string; max: number; weight: number; description?: string; rounds?: number[] | null; required?: boolean; scale?: 'number'|'radio'|'range' }[]; eventSlug?: string }
    if (!Array.isArray(rubric) || rubric.length === 0) {
      return Response.json({ error: 'invalid_rubric' }, { status: 400 })
    }
    // Basic validation
    for (const r of rubric) {
      if (!r.key || !r.label || typeof r.max !== 'number' || typeof r.weight !== 'number') {
        return Response.json({ error: 'invalid_item' }, { status: 400 })
      }
      if (r.rounds && !Array.isArray(r.rounds)) {
        return Response.json({ error: 'invalid_rounds' }, { status: 400 })
      }
      if (r.scale && !['number','radio','range'].includes(r.scale)) {
        return Response.json({ error: 'invalid_scale' }, { status: 400 })
      }
    }
    const slug = eventSlug
    if (!slug) {
      return Response.json({ error: 'eventSlug required' }, { status: 400 })
    }
    const evt = await prisma.event.findUnique({ where: { slug }, include: { organization: true } })
    if (!evt) return Response.json({ error: 'no_event' }, { status: 400 })

    const uid = session.user.id as string
    const isOwner = evt.organization?.ownerId === uid
    const sameOrg = session.user.orgId && session.user.orgId === evt.orgId
    if (!isOwner && !sameOrg) return Response.json({ error: 'forbidden' }, { status: 403 })
    const rules = { ...(evt.rules as any || {}), rubric }
    await prisma.event.update({ where: { id: evt.id }, data: { rules } })
    try {
      // Broadcast rubric change to SSE subscribers scoped to this event
      try { hub.broadcast('scoring-schema', { eventSlug: slug, rubric }) } catch (e) { /* ignore hub errors */ }
    } catch {}
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
