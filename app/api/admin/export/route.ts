import { prisma } from '../../../../lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session: any = await getServerSession(authOptions as any)
        if (!session || !session.user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

        const url = new URL(request.url)
        const eventSlug = url.searchParams.get('eventSlug')
        if (!eventSlug) return Response.json({ error: 'eventSlug required' }, { status: 400 })

        const event = await prisma.event.findUnique({
            where: { slug: eventSlug },
            include: { organization: true }
        })
        if (!event) return Response.json({ error: 'event_not_found' }, { status: 404 })

        // CSRF/Auth check
        const uid = session.user.id
        if (event.organization.ownerId !== uid && session.user.orgId !== event.orgId) {
            return Response.json({ error: 'forbidden' }, { status: 403 })
        }

        const participants = await prisma.participant.findMany({
            where: { eventId: event.id },
            include: { scores: true },
            orderBy: { totalScore: 'desc' }
        })

        // Generate CSV
        // Header: Rank, Name, Kind, Total Score, [Criteria...]
        const criteriaSet = new Set<string>()
        participants.forEach(p => p.scores.forEach(s => criteriaSet.add(s.criterion)))
        const criteria = Array.from(criteriaSet)

        let csv = `Rank,Name,Kind,Total Score,${criteria.join(',')}\n`
        participants.forEach((p, idx) => {
            const row = [
                idx + 1,
                `"${p.name.replace(/"/g, '""')}"`,
                p.kind,
                p.totalScore,
                ...criteria.map(c => {
                    const s = p.scores.find(sc => sc.criterion === c)
                    return s ? s.value : 0
                })
            ]
            csv += row.join(',') + '\n'
        })

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="results-${eventSlug}.csv"`
            }
        })
    } catch (error: any) {
        return Response.json({ error: error.message || 'export_failed' }, { status: 500 })
    }
}
