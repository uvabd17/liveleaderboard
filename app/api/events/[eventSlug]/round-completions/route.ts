import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function toCsv(rows: any[]) {
  const header = ['id','participantId','roundNumber','judgeUserId','completedAt','durationSeconds','comments']
  const lines = [header.join(',')]
  for (const r of rows) {
    const safe = (v: any) => {
      if (v === null || v === undefined) return ''
      const s = String(v).replace(/"/g, '""')
      return `"${s}"`
    }
    const comments = Array.isArray(r.comments) ? r.comments.map((c: any) => `${c.judgeUserId || ''}: ${c.comment || ''}`).join(' || ') : ''
    lines.push([r.id, r.participantId, r.roundNumber, r.judgeUserId, r.completedAt, r.durationSeconds, comments].map(safe).join(','))
  }
  return lines.join('\n')
}

export async function GET(req: Request, { params }: { params: { eventSlug: string } }) {
  const { eventSlug } = params
  const url = new URL(req.url)
  const rn = url.searchParams.get('roundNumber')
  const roundNumber = rn !== null ? Number(rn) : undefined
  const format = url.searchParams.get('format') || 'json'
  const participantId = url.searchParams.get('participantId') || undefined
  const judgeUserId = url.searchParams.get('judgeUserId') || undefined

  const event = await db.event.findUnique({ where: { slug: eventSlug } })
  if (!event) return NextResponse.json({ error: 'event not found' }, { status: 404 })

  const where: any = { eventId: event.id }
  if (typeof roundNumber === 'number' && !Number.isNaN(roundNumber)) where.roundNumber = roundNumber
  if (participantId) where.participantId = participantId
  if (judgeUserId) where.judgeUserId = judgeUserId

  const rows = await db.roundCompletion.findMany({ where, orderBy: { completedAt: 'desc' } })

  // Optimize: Fetch all comments in one query instead of N+1
  const participantIds = rows.map(r => r.participantId)
  const allComments = participantIds.length > 0 
    ? await db.score.findMany({
        where: {
          eventId: event.id,
          participantId: { in: participantIds },
          comment: { not: null }
        },
        select: { participantId: true, judgeUserId: true, comment: true }
      })
    : []

  // Group comments by participantId
  const commentsByParticipant = new Map<string, Array<{ judgeUserId: string | null; comment: string | null }>>()
  for (const comment of allComments) {
    if (!commentsByParticipant.has(comment.participantId)) {
      commentsByParticipant.set(comment.participantId, [])
    }
    commentsByParticipant.get(comment.participantId)!.push({
      judgeUserId: comment.judgeUserId,
      comment: comment.comment
    })
  }

  // Map comments to completions
  const rowsWithComments = rows.map(r => ({
    ...r,
    comments: commentsByParticipant.get(r.participantId) || []
  }))

  if (format === 'csv') {
    const csv = toCsv(rowsWithComments)
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${eventSlug}-round-completions.csv"` } })
  }

  return NextResponse.json({ rows: rowsWithComments })
}
