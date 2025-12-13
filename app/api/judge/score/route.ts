import { db } from '../../../../lib/db'
import { hub } from '../../../../lib/hub'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const body = await request.json()
    let { eventSlug, participantId, scores, comment, roundNumber } = body as any

    // Normalize scores shape: accept either object map or array of { criterion, value }
    const scoresMap: Record<string, number> = {}
    if (!eventSlug || !participantId || !scores) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    if (Array.isArray(scores)) {
      for (const s of scores) {
        const key = s?.criterion ?? s?.key ?? s?.criterionKey ?? s?.criterionId
        const val = s?.value ?? s?.score ?? 0
        if (!key) continue
        const n = Number(val)
        scoresMap[String(key)] = Number.isFinite(n) ? Math.floor(n) : 0
      }
    } else if (typeof scores === 'object') {
      for (const [k, v] of Object.entries(scores)) {
        const n = Number(v)
        scoresMap[k] = Number.isFinite(n) ? Math.floor(n) : 0
      }
    }
    if (Object.keys(scoresMap).length === 0) {
      return NextResponse.json({ error: 'invalid_scores' }, { status: 400 })
    }
    
    // Find participant (and derive event if needed)
    const participantRow = await db.participant.findUnique({ where: { id: participantId }, include: { event: true } })
    if (!participantRow) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    let event = participantRow.event
    if (eventSlug) {
      // If eventSlug provided, prefer explicit event lookup and validate participant belongs to it
      const evt = await db.event.findUnique({ where: { slug: eventSlug } })
      if (!evt) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      if (evt.id !== participantRow.eventId) {
        return NextResponse.json({ error: 'participant_event_mismatch' }, { status: 400 })
      }
      event = evt
    } else {
      // derive slug for downstream broadcasts
      eventSlug = event?.slug
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isAdminSession = !!session?.user?.orgId && session.user.orgId === event.orgId
    const rules = (event.rules || {}) as any
    const now = Date.now()
    const judgingClosedByRule = rules?.judgingClosed === true
    const eventEnded = event.endAt ? new Date(event.endAt).getTime() < now : false
    if ((judgingClosedByRule || eventEnded) && !isAdminSession) {
      return NextResponse.json({ error: 'judging_closed' }, { status: 403 })
    }

    // participantRow already fetched above (includes .event)
    const participant = participantRow

    const judgeId = session?.user?.id || 'anonymous-judge'

    // Validate rubric keys from event.rules
    const rulesRubric = (event.rules as any)?.rubric || []
    const rubricKeys = Array.isArray(rulesRubric) ? rulesRubric.map((r: any) => r.key ?? r.name ?? r.label) : []
    // Filter scoresMap to only known rubric keys (allow server-side mapping)
    const filteredEntries = Object.entries(scoresMap).filter(([k]) => rubricKeys.includes(k))
    if (filteredEntries.length === 0) {
      return NextResponse.json({ error: 'no_valid_criteria' }, { status: 400 })
    }

    // Store scores for each criterion
    const scorePromises = filteredEntries.map(async ([criterion, value]) => {
      // Check if score already exists (idempotent upsert)
      const existing = await db.score.findFirst({
        where: {
          eventId: event.id,
          participantId,
          judgeUserId: judgeId,
          criterion
        }
      })

      if (existing) {
        // Update existing score
        return db.score.update({
          where: { id: existing.id },
          data: { 
            value: Math.floor(value),
            comment: comment || null,
            updatedAt: new Date()
          }
        })
      } else {
        // Create new score
        return db.score.create({
          data: {
            eventId: event.id,
            participantId,
            judgeUserId: judgeId,
            criterion,
            value: Math.floor(value),
            comment: comment || null
          }
        })
      }
    })

    await Promise.all(scorePromises)

    // If a roundNumber was provided, record this participant's completion for that round
    if (typeof roundNumber === 'number' && !isNaN(roundNumber)) {
      try {
        // Attempt to compute durationSeconds using round start time from event.rules
        let durationSeconds: number | null = null
        try {
          const rules = (event.rules || {}) as any
          const rounds = Array.isArray(rules.rounds) ? rules.rounds : []
          // rounds array is zero-indexed; incoming roundNumber is treated as 1-based
          const roundIdx = Math.max(0, Number(roundNumber) - 1)
          const roundCfg = rounds[roundIdx]
          if (roundCfg && roundCfg.timerStartedAt) {
            const started = new Date(roundCfg.timerStartedAt).getTime()
            durationSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000))
          }
        } catch (err) {
          // ignore
        }

        await db.roundCompletion.upsert({
          where: {
            eventId_participantId_roundNumber: {
              eventId: event.id,
              participantId,
              roundNumber: roundNumber
            }
          },
          update: {
            judgeUserId: judgeId,
            completedAt: new Date(),
            durationSeconds: durationSeconds ?? undefined,
          },
          create: {
            eventId: event.id,
            participantId,
            roundNumber: roundNumber,
            judgeUserId: judgeId,
            completedAt: new Date(),
            durationSeconds: durationSeconds ?? undefined,
          }
        })
      } catch (err) {
        console.error('Failed to upsert round completion', err)
      }
    }

    // Calculate updated leaderboard
    const participants = await db.participant.findMany({
      where: { eventId: event.id },
      include: {
        scores: true
      }
    })

    const leaderboard = participants.map(p => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      score: p.scores.reduce((sum, s) => sum + s.value, 0),
      rank: 0
    }))

    leaderboard.sort((a, b) => b.totalScore - a.totalScore)
    leaderboard.forEach((p, index) => { p.rank = index + 1 })

    // Broadcast update via SSE (use 'leaderboard' type so clients listen properly)
    hub.broadcast('leaderboard', {
      eventSlug,
      leaderboard: leaderboard,
      timestamp: new Date().toISOString()
    })

    // If we recorded a round completion above, broadcast a specific event for it
    if (typeof roundNumber === 'number' && !isNaN(roundNumber)) {
      try {
        hub.broadcast('round-completion', {
          eventSlug,
          participantId,
          roundNumber,
          completedAt: new Date().toISOString()
        })
      } catch (err) {
        // ignore
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Scores submitted successfully' 
    })
  } catch (error) {
    console.error('Score submission error:', error)
    return NextResponse.json({ 
      error: 'Failed to submit scores' 
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const participantId = url.searchParams.get('participantId')
    if (!participantId) return NextResponse.json({ error: 'missing participantId' }, { status: 400 })

    const participantRow = await db.participant.findUnique({ where: { id: participantId }, include: { event: true } })
    if (!participantRow) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    const event = participantRow.event
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const rows = await db.score.findMany({ where: { eventId: event.id, participantId } })
    // Also fetch round completions for this participant
    const completions = await db.roundCompletion.findMany({ where: { eventId: event.id, participantId } })
    if ((!rows || rows.length === 0) && (!completions || completions.length === 0)) return NextResponse.json({ conflict: false, variance: 0, completedRounds: [], completedCurrentRound: false })

    const rules = (event.rules || {}) as any
    const rubric: { key: string; label?: string; max?: number; weight?: number; rounds?: number[] | null }[] = Array.isArray(rules.rubric) ? rules.rubric : [
      { key: 'innovation', label: 'Innovation', max: 100, weight: 1 },
      { key: 'impact', label: 'Impact', max: 100, weight: 1 },
      { key: 'technical', label: 'Technical', max: 100, weight: 1 },
    ]

    const byJudgeTotals: Record<string, number> = {}
    for (const j of Array.from(new Set(rows.map(r => r.judgeUserId || 'unknown')))) {
      let jwTotal = 0
      let jwWeights = 0
      for (const r of rubric) {
        const w = r.weight ?? 1
        const row = rows.find(x => (x.judgeUserId || 'unknown') === j && x.criterion === r.key)
        const val = row ? row.value : 0
        const normalized = (r.max && r.max > 0) ? (val / r.max) : 0
        jwTotal += normalized * w
        jwWeights += w
      }
      byJudgeTotals[j] = jwWeights > 0 ? (jwTotal / jwWeights) * 100 : 0
    }

    const judgeScores = Object.values(byJudgeTotals)
    let variance = 0
    let conflict = false
    if (judgeScores.length > 1) {
      const mean = judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length
      variance = judgeScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / judgeScores.length
      const stddev = Math.sqrt(variance)
      conflict = stddev > 10
    }

    const currentRound = event.currentRound ?? 0
    const displayRound = currentRound + 1
    const completedRounds = completions.map(c => c.roundNumber)
    const completedCurrentRound = completedRounds.includes(displayRound)
    return NextResponse.json({ conflict, variance, completedRounds, completedCurrentRound })
  } catch (err) {
    console.error('GET /api/judge/score error', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
