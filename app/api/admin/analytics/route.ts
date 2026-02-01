import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const eventSlug = searchParams.get('eventSlug')

        if (!eventSlug) {
            return NextResponse.json({ error: 'Event slug is required' }, { status: 400 })
        }

        const event = await db.event.findUnique({
            where: { slug: eventSlug },
            include: {
                _count: {
                    select: { participants: true, judges: true }
                }
            }
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Fetch all scores for this event
        const scores = await db.score.findMany({
            where: { eventId: event.id },
            select: {
                value: true,
                judgeUserId: true,
                participantId: true,
                criterion: true,
                createdAt: true
            }
        })

        // Fetch all judges
        const judges = await db.judge.findMany({
            where: { eventId: event.id },
            select: { id: true, name: true, email: true }
        })

        // Processing Analytics
        const analytics = {
            judgeStats: judges.map(judge => {
                const judgeScores = scores.filter(s => s.judgeUserId === judge.id)
                const participantsScored = new Set(judgeScores.map(s => s.participantId)).size
                const avgScore = judgeScores.length > 0
                    ? judgeScores.reduce((sum, s) => sum + s.value, 0) / judgeScores.length
                    : 0

                return {
                    id: judge.id,
                    name: judge.name || 'Anonymous Judge',
                    participantsScored,
                    avgScore: Number(avgScore.toFixed(2)),
                    totalSubmissions: judgeScores.length
                }
            }),
            overall: {
                totalScoresSubmitted: scores.length,
                averagePoints: scores.length > 0
                    ? Number((scores.reduce((sum, s) => sum + s.value, 0) / scores.length).toFixed(2))
                    : 0,
                participantsWithScores: new Set(scores.map(s => s.participantId)).size
            },
            timeMatrix: scores.reduce((acc: any, s) => {
                const date = s.createdAt.toISOString().split('T')[0]
                acc[date] = (acc[date] || 0) + 1
                return acc
            }, {})
        }

        return NextResponse.json(analytics)
    } catch (error) {
        console.error('Analytics error:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
