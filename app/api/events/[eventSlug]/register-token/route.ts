import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: { eventSlug: string } }) {
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
    const body = await request.json()
    const { usesLeft = 1, expiresInMinutes, public: isPublic = false } = body as { usesLeft?: number | null; expiresInMinutes?: number; public?: boolean }

    const token = crypto.randomBytes(8).toString('hex')
    const expiresAt = expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60 * 1000) : null

    // If requesting a public token, return an existing valid public token if present
    if (isPublic) {
      const now = new Date()
      const existing = await db.registrationToken.findFirst({
        where: {
          eventId: event.id,
          public: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
      if (existing) {
        const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const url = `${base}/e/${event.slug}/register?token=${encodeURIComponent(existing.token)}`
        return new Response(JSON.stringify({ ok: true, token: existing.token, url, reused: true }), { status: 200 })
      }
    }

    const rec = await db.registrationToken.create({
      data: {
        token,
        eventId: event.id,
        createdById: session.user.id as string,
        usesLeft: isPublic ? null : usesLeft ?? null,
        singleUse: !isPublic && usesLeft === 1,
        expiresAt,
        public: isPublic,
      }
    })

    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const url = `${base}/e/${event.slug}/register?token=${encodeURIComponent(token)}`

    return new Response(JSON.stringify({ ok: true, token: rec.token, url }), { status: 201 })
  } catch (e: any) {
    console.error('create register token', e)
    return new Response(JSON.stringify({ error: e?.message || 'error' }), { status: 500 })
  }
}
