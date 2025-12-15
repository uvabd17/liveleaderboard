import { prisma } from '../../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Fetch all events for a judge by their code
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'code required' }, { status: 400 })
    }

    // Find all judges with this code across all events
    const judges = await prisma.judge.findMany({
      where: { 
        code: code.toUpperCase(), 
        active: true 
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logoUrl: true,
            currentRound: true,
            startAt: true,
            endAt: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filter out expired judges and get unique events
    const validJudges = judges.filter(j => {
      if (j.expiresAt && j.expiresAt < new Date()) return false
      return true
    })

    const events = validJudges.map(j => ({
      event: j.event,
      judgeId: j.id,
      judgeName: j.name || 'Judge',
      role: j.role
    }))

    // Remove duplicates by event ID
    const uniqueEvents = Array.from(
      new Map(events.map(e => [e.event.id, e])).values()
    )

    return Response.json({ 
      ok: true, 
      events: uniqueEvents,
      count: uniqueEvents.length
    })
  } catch (e: any) {
    console.error('Error fetching judge events:', e)
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

