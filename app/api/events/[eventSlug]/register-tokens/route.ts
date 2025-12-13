import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: { eventSlug: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })

    const { eventSlug } = params
    const event = await db.event.findUnique({ where: { slug: eventSlug }, include: { organization: true } })
    if (!event) return new Response(JSON.stringify({ error: 'event_not_found' }), { status: 404 })

    // permission check: must be org owner or in same org
    const uid = session.user.id as string
    const isOwner = event.organization?.ownerId === uid
    const sameOrg = session.user.orgId && session.user.orgId === event.orgId
    if (!isOwner && !sameOrg) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })

    const tokens = await db.registrationToken.findMany({ where: { eventId: event.id }, orderBy: { createdAt: 'desc' } })

    const payload = tokens.map(t => ({
      id: t.id,
      token: t.token,
      public: t.public,
      usesLeft: t.usesLeft,
      singleUse: t.singleUse,
      scanCount: t.scanCount,
      registrationsCount: t.registrationsCount,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      createdById: t.createdById,
    }))

    return new Response(JSON.stringify({ ok: true, tokens: payload }), { status: 200 })
  } catch (e: any) {
    console.error('fetch tokens', e)
    return new Response(JSON.stringify({ error: e?.message || 'error' }), { status: 500 })
  }
}
