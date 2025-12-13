import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
    }

    const body = await request.json()
    const { token } = body as { token: string }
    if (!token) return new Response(JSON.stringify({ error: 'missing_token' }), { status: 400 })

    const invite = await db.judgeInvite.findUnique({ where: { token } })
    if (!invite) return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 404 })
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'expired' }), { status: 410 })
    }

    // Ensure not already used for single-use invites
    if (invite.singleUse && invite.usedAt) {
      return new Response(JSON.stringify({ error: 'already_used' }), { status: 409 })
    }

    const userId = session.user.id as string

    // Create judge record
    const code = crypto.randomBytes(6).toString('hex')
    const judge = await db.judge.create({
      data: {
        eventId: invite.eventId,
        name: session.user.name || null,
        email: session.user.email || null,
        code,
        role: 'judge',
      }
    })

    // Mark invite as used
    await db.judgeInvite.update({ where: { id: invite.id }, data: { usedById: userId, usedAt: new Date() } })

    return new Response(JSON.stringify({ ok: true, judge }), { status: 201 })
  } catch (e: any) {
    console.error('accept invite', e)
    return new Response(JSON.stringify({ error: e?.message || 'error' }), { status: 500 })
  }
}
