import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { eventSlug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
    }

    const { eventSlug } = params
    const body = await request.json().catch(() => ({}))
    const { expiresInMinutes = 60, singleUse = false, note } = body as {
      expiresInMinutes?: number
      singleUse?: boolean
      note?: string
    }

    // Find event by slug
    const event = await db.event.findUnique({ where: { slug: eventSlug } })
    if (!event) {
      return new Response(JSON.stringify({ error: 'event_not_found' }), { status: 404 })
    }

    // Ensure requesting user belongs to org owning the event
    const userId = session.user.id as string
    const user = await db.user.findUnique({ where: { id: userId }, include: { ownedOrgs: true } })
    if (!user || (user.orgId && user.orgId !== event.orgId && (user.ownedOrgs?.length ?? 0) === 0)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    const token = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

    const invite = await db.judgeInvite.create({
      data: {
        token,
        eventId: event.id,
        createdById: userId,
        expiresAt,
        singleUse,
      }
    })

    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteUrl = `${base}/e/${event.slug}/judge/join?token=${encodeURIComponent(token)}`

    return new Response(JSON.stringify({ 
      ok: true, 
      token: invite.token,
      inviteUrl, 
      expiresAt,
      invite: { id: invite.id, token, inviteUrl, expiresAt } 
    }), { status: 201 })
  } catch (e: any) {
    console.error('judge-invites error', e)
    return new Response(JSON.stringify({ error: e?.message || 'error' }), { status: 500 })
  }
}
