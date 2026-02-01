import { prisma } from '../../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { code, eventSlug } = await request.json()
    if (!code || typeof code !== 'string') return Response.json({ error: 'invalid_code' }, { status: 400 })

    // If eventSlug provided, use it; otherwise try to find judge by code across all events
    let evt = null
    if (eventSlug) {
      evt = await prisma.event.findUnique({ where: { slug: eventSlug } })
    } else {
      // Find judge first, then get event
      const judge = await prisma.judge.findFirst({ where: { code: code.toUpperCase(), active: true } })
      if (judge) {
        evt = await prisma.event.findUnique({ where: { id: judge.eventId } })
      }
    }

    if (!evt) return Response.json({ error: 'no_event' }, { status: 400 })

    const judge = await prisma.judge.findFirst({ where: { eventId: evt.id, active: true, OR: [{ code: code.toUpperCase() }, { hashedCode: { not: null } }] } })
    if (!judge) return Response.json({ error: 'not_found' }, { status: 404 })

    // Verify code
    const { compare } = await import('bcryptjs')
    let isValid = false
    if (judge.hashedCode) {
      isValid = await compare(code.toUpperCase(), judge.hashedCode)
    } else if (judge.code === code.toUpperCase()) {
      // Legacy plain text check (optional: auto-upgrade here or just allow once)
      isValid = true
    }

    if (!isValid) return Response.json({ error: 'invalid_code' }, { status: 401 })
    if (judge.expiresAt && judge.expiresAt < new Date()) return Response.json({ error: 'expired' }, { status: 400 })

    // Check if judge is assigned to multiple events
    const allJudges = await prisma.judge.findMany({
      where: {
        code: code.toUpperCase(),
        active: true
      },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            name: true
          }
        }
      }
    })

    const validJudges = allJudges.filter(j => {
      if (j.expiresAt && j.expiresAt < new Date()) return false
      return true
    })

    const uniqueEvents = Array.from(
      new Map(validJudges.map(j => [j.event.id, j.event])).values()
    )

    return Response.json({
      ok: true,
      judgeId: judge.id,
      judgeName: judge.name || 'Judge',
      role: judge.role,
      eventSlug: evt.slug,
      eventName: evt.name,
      hasMultipleEvents: uniqueEvents.length > 1,
      events: uniqueEvents.length > 1 ? uniqueEvents : undefined
    })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
