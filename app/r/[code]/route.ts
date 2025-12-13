import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const code = params.code
    if (!code) return new Response('Missing code', { status: 400 })

    const reg = await db.registrationToken.findUnique({ where: { token: code } })
    if (!reg) return new Response('Invalid token', { status: 404 })

    // Expiry / uses checks: allow opening for unlimited (public) or if still has uses
    const now = Date.now()
    const expired = reg.expiresAt ? new Date(reg.expiresAt).getTime() < now : false
    const usedUp = reg.usesLeft !== null && reg.usesLeft <= 0
    if (expired || usedUp) {
      const event = await db.event.findUnique({ where: { id: reg.eventId } })
      const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const fallback = `${base}/e/${event?.slug || ''}/register`
      return Response.redirect(fallback, 302)
    }

    // Increment scan count for analytics
    await db.registrationToken.update({ where: { id: reg.id }, data: { scanCount: { increment: 1 } } })

    const event = await db.event.findUnique({ where: { id: reg.eventId } })
    if (!event) return new Response('Event not found', { status: 404 })

    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const url = `${base}/e/${event.slug}/register?token=${encodeURIComponent(code)}`
    return Response.redirect(url, 302)
  } catch (e: any) {
    return new Response(e?.message || 'error', { status: 500 })
  }
}
