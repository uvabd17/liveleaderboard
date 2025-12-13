import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/db'

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

  const event = await prisma.event.findUnique({ where: { slug: eventSlug } })
  if (!event) return NextResponse.json({ error: 'event not found' }, { status: 404 })

  const where: any = { eventId: event.id }
  if (typeof roundNumber === 'number' && !Number.isNaN(roundNumber)) where.roundNumber = roundNumber
  if (participantId) where.participantId = participantId
  if (judgeUserId) where.judgeUserId = judgeUserId

  const rows = await prisma.roundCompletion.findMany({ where, orderBy: { completedAt: 'desc' } })

  // Aggregate judge comments for each completion (fetch scores/comments by participant+round)
  const rowsWithComments = await Promise.all(rows.map(async (r) => {
    const commentsWhere: any = { eventId: r.eventId, participantId: r.participantId }
    if (r.judgeUserId) commentsWhere.judgeUserId = r.judgeUserId
    const comments = await prisma.score.findMany({ where: commentsWhere, select: { judgeUserId: true, comment: true } })
    return { ...r, comments }
  }))

  if (format === 'csv') {
    const csv = toCsv(rowsWithComments)
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${eventSlug}-round-completions.csv"` } })
  }

  return NextResponse.json({ rows: rowsWithComments })
}
