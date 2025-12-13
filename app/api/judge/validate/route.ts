import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    if (!token) return new Response(JSON.stringify({ error: 'missing_token' }), { status: 400 })

    const invite = await db.judgeInvite.findUnique({ where: { token } })
    if (!invite) return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 404 })
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'expired' }), { status: 410 })
    }

    const event = await db.event.findUnique({ where: { id: invite.eventId } })
    if (!event) return new Response(JSON.stringify({ error: 'event_not_found' }), { status: 404 })

    return new Response(JSON.stringify({ ok: true, invite: { id: invite.id, token: invite.token, singleUse: invite.singleUse, expiresAt: invite.expiresAt }, event: { id: event.id, slug: event.slug, name: event.name } }), { status: 200 })
  } catch (e: any) {
    console.error('validate invite', e)
    return new Response(JSON.stringify({ error: e?.message || 'error' }), { status: 500 })
  }
}
