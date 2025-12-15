import { db } from '../../../../lib/db'
import { hub } from '../../../../lib/hub'

// Idempotency store: prefer Redis (ioredis) if available, otherwise in-memory TTL map
const IDEMP_TTL_MS = Number(process.env.IDEMPOTENCY_TTL_MS) || 24 * 60 * 60 * 1000
let idempotencyStore: {
  has: (key: string) => Promise<boolean>
  set: (key: string, ttlMs?: number) => Promise<void>
}

// default in-memory fallback
(() => {
  const map = new Map<string, number>()
  idempotencyStore = {
    async has(key: string) {
      const t = map.get(key)
      if (!t) return false
      if (t < Date.now()) { map.delete(key); return false }
      return true
    },
    async set(key: string, ttlMs = IDEMP_TTL_MS) {
      map.set(key, Date.now() + ttlMs)
    }
  }
  // try to enable Redis-backed store if ioredis is installed and REDIS_URL provided
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis')
    if (process.env.REDIS_URL) {
      const rc = new IORedis(process.env.REDIS_URL)
      idempotencyStore = {
        async has(key: string) {
          try { const v = await rc.get(`idemp:${key}`); return !!v } catch { return false }
        },
        async set(key: string, ttlMs = IDEMP_TTL_MS) {
          try { await rc.set(`idemp:${key}`, '1', 'PX', `${ttlMs}`) } catch {}
        }
      }
    }
  } catch (e) {
    // ignore - fallback remains in-memory
  }
})()
// Optional Redis client for cross-instance leaderboard and idempotency
let redisClient: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const IORedis = require('ioredis')
  if (process.env.REDIS_URL) redisClient = new IORedis(process.env.REDIS_URL)
} catch (e) {
  // ignore - redis optional
}
// If Redis not configured, but Prisma `db` is available, use a SQL-backed idempotency table
if (!process.env.REDIS_URL && typeof db !== 'undefined') {
  idempotencyStore = {
    async has(key: string) {
      try {
        const rows: any = await db.$queryRaw`SELECT "expires_at" FROM "IdempotencyKey" WHERE "key" = ${key}`
        if (!rows || rows.length === 0) return false
        const expires = new Date(rows[0].expires_at)
        if (expires.getTime() < Date.now()) {
          try { await db.$executeRaw`DELETE FROM "IdempotencyKey" WHERE "key" = ${key}` } catch {}
          return false
        }
        return true
      } catch (err) {
        try { await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "IdempotencyKey" ("key" text PRIMARY KEY, "expires_at" timestamptz)') } catch {}
        return false
      }
    },
    async set(key: string, ttlMs = IDEMP_TTL_MS) {
      try {
        const expires = new Date(Date.now() + ttlMs).toISOString()
        await db.$executeRaw`INSERT INTO "IdempotencyKey" ("key","expires_at") VALUES (${key}, ${expires}) ON CONFLICT ("key") DO UPDATE SET "expires_at" = GREATEST("IdempotencyKey"."expires_at", EXCLUDED."expires_at")`
      } catch (err) {
        try { await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "IdempotencyKey" ("key" text PRIMARY KEY, "expires_at" timestamptz)') } catch {}
        try {
          const expires = new Date(Date.now() + ttlMs).toISOString()
          await db.$executeRaw`INSERT INTO "IdempotencyKey" ("key","expires_at") VALUES (${key}, ${expires}) ON CONFLICT ("key") DO UPDATE SET "expires_at" = GREATEST("IdempotencyKey"."expires_at", EXCLUDED."expires_at")`
        } catch {}
      }
    }
  }
}
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const body = await request.json()
    let { eventSlug, participantId, scores, comment, roundNumber, idempotencyKey } = body as any

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

    // Validate roundNumber is provided
    if (typeof roundNumber !== 'number' || isNaN(roundNumber) || roundNumber < 1) {
      return NextResponse.json({ error: 'roundNumber required and must be >= 1' }, { status: 400 })
    }

    // Check if judging is open for this round
    const rounds = Array.isArray(rules.rounds) ? rules.rounds : []
    const roundIdx = Math.max(0, Number(roundNumber) - 1)
    const roundCfg = rounds[roundIdx]
    if (!roundCfg?.judgingOpen && !isAdminSession) {
      return NextResponse.json({ 
        error: 'judging_not_open_for_round', 
        message: `Judging is not open for round ${roundNumber}` 
      }, { status: 403 })
    }

    // Check if round is already completed for this participant (prevent rescoring)
    const existingCompletion = await db.roundCompletion.findUnique({
      where: {
        eventId_participantId_roundNumber: {
          eventId: event.id,
          participantId,
          roundNumber: roundNumber
        }
      }
    })

    if (existingCompletion && !isAdminSession) {
      return NextResponse.json({ 
        error: 'round_already_completed', 
        message: 'This round has already been completed for this participant. Rescoring is not allowed.' 
      }, { status: 403 })
    }

    // Validate rubric keys from event.rules - FILTER BY ROUND NUMBER
    const rulesRubric = (event.rules as any)?.rubric || []
    const rubricForRound = Array.isArray(rulesRubric) 
      ? rulesRubric.filter((r: any) => {
          // If rounds array is null/undefined, criterion applies to all rounds
          if (!r.rounds || !Array.isArray(r.rounds)) return true
          // Otherwise, check if this roundNumber is in the rounds array
          return r.rounds.includes(roundNumber)
        })
      : []
    
    const rubricKeys = rubricForRound.map((r: any) => r.key ?? r.name ?? r.label)
    
    // Filter scoresMap to only known rubric keys for this round
    const filteredEntries = Object.entries(scoresMap).filter(([k]) => rubricKeys.includes(k))
    if (filteredEntries.length === 0) {
      return NextResponse.json({ 
        error: 'no_valid_criteria_for_round', 
        message: `No valid criteria found for round ${roundNumber}. Please ensure you're scoring criteria assigned to this round.` 
      }, { status: 400 })
    }

    // Validate that all required criteria for this round are provided
    const requiredCriteria = rubricForRound.filter((r: any) => r.required !== false)
    const providedKeys = filteredEntries.map(([k]) => k)
    const missingRequired = requiredCriteria
      .map((r: any) => r.key ?? r.name ?? r.label)
      .filter((key: string) => !providedKeys.includes(key))
    
    if (missingRequired.length > 0) {
      return NextResponse.json({ 
        error: 'missing_required_criteria', 
        message: `Missing required criteria for round ${roundNumber}: ${missingRequired.join(', ')}` 
      }, { status: 400 })
    }

    // Enqueue score writes: prefer Redis queue for cross-instance processing, otherwise in-memory batcher
    const nowEnqueue = Date.now()
    if (typeof redisClient !== 'undefined' && redisClient) {
      try {
        for (const [criterion, value] of filteredEntries) {
          const item = {
            eventId: event.id,
            eventSlug,
            participantId,
            judgeUserId: judgeId,
            idempotencyKey: idempotencyKey || null,
            criterion,
            value: Math.floor(value),
            comment: comment || null,
            roundNumber,
            enqueuedAt: nowEnqueue
          }
          await redisClient.rpush('score_queue', JSON.stringify(item))
        }
      } catch (e) {
        // on redis failure, fallback to in-memory batching
        for (const [criterion, value] of filteredEntries) {
          SCORE_BATCH.queue.push({
            eventId: event.id,
            eventSlug,
            participantId,
            judgeUserId: judgeId,
            idempotencyKey: idempotencyKey || null,
            criterion,
            value: Math.floor(value),
            comment: comment || null,
            roundNumber,
            enqueuedAt: nowEnqueue
          })
        }
        if (!SCORE_BATCH.timer) {
          SCORE_BATCH.timer = setTimeout(() => flushScoreBatch().catch(err => console.error('Batch flush failed', err)), SCORE_BATCH.flushMs)
        }
      }
    } else {
      for (const [criterion, value] of filteredEntries) {
        SCORE_BATCH.queue.push({
          eventId: event.id,
          eventSlug,
          participantId,
          judgeUserId: judgeId,
          idempotencyKey: idempotencyKey || null,
          criterion,
          value: Math.floor(value),
          comment: comment || null,
          roundNumber,
          enqueuedAt: nowEnqueue
        })
      }
      if (!SCORE_BATCH.timer) {
        SCORE_BATCH.timer = setTimeout(() => flushScoreBatch().catch(err => console.error('Batch flush failed', err)), SCORE_BATCH.flushMs)
      }
    }

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

    // Calculate updated leaderboard using aggregation (optimized query)
    // Compute trimmed leaderboard using denormalized Participant.totalScore and broadcast only top-N
    const TOP_N = 50
    try {
      const rows = await db.participant.findMany({
        where: { eventId: event.id },
        orderBy: { totalScore: 'desc' },
        take: TOP_N,
        select: { id: true, name: true, kind: true, totalScore: true }
      })

      const leaderboard = rows.map((r, i) => ({ id: r.id, name: r.name, kind: r.kind as any, score: Number(r.totalScore ?? 0), rank: i + 1 }))

      try {
        hub.broadcast('leaderboard', { eventSlug, leaderboard, timestamp: new Date().toISOString() })
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error('Failed to fetch trimmed leaderboard from participants', err)
    }

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

    return NextResponse.json({ success: true, queued: true })
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

// ---------- In-process score batcher (groups writes and reduces DB load) ----------
const SCORE_BATCH: {
  queue: Array<{
    eventId: string
    eventSlug?: string
    participantId: string
    judgeUserId: string
    criterion: string
    value: number
    comment?: string | null
    roundNumber?: number
    enqueuedAt: number
  }>
  timer: any | null
  flushMs: number
} = { queue: [], timer: null, flushMs: Number(process.env.SCORE_BATCH_MS) || 100 }

async function flushScoreBatch() {
  const batch = SCORE_BATCH.queue.splice(0)
  SCORE_BATCH.timer = null
  if (!batch || batch.length === 0) return

  // Group by eventId+participantId+judgeUserId so we can fetch existing scores in bulk
  const groups = new Map<string, typeof batch>()
  const eventsToBroadcast = new Set<string>()

  for (const item of batch) {
    const key = `${item.eventId}||${item.participantId}||${item.judgeUserId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
    if (item.eventSlug) eventsToBroadcast.add(item.eventSlug)
  }

  // Process each group in sequence (keeps transactions smaller)
  for (const [key, items] of groups.entries()) {
    const [eventId, participantId, judgeUserId] = key.split('||')
    try {
      const criteria = Array.from(new Set(items.map(i => i.criterion)))
      const idempKeys = Array.from(new Set(items.map(i => (i as any).idempotencyKey).filter(Boolean)))
      // fetch existing scores by criterion
      const existing = await db.score.findMany({ where: { eventId, participantId, judgeUserId, criterion: { in: criteria } } })
      // also fetch any scores that match provided idempotency keys to detect already-applied requests
      let existingByIdemp: any[] = []
      if (idempKeys.length > 0) {
        existingByIdemp = await db.score.findMany({ where: { idempotencyKey: { in: idempKeys }, eventId } })
      }
      const existingByCriterion = new Map(existing.map(e => [e.criterion, e]))
      const existingByIdempKey = new Map(existingByIdemp.map(e => [e.idempotencyKey, e]))

      const ops: any[] = []
      for (const it of items) {
        // If an idempotency key was provided and a matching score exists (DB or store), skip to ensure idempotency
        const idk = (it as any).idempotencyKey
        if (idk) {
          // check persistent store first
          try {
            const seen = await idempotencyStore.has(idk)
            if (seen) continue
          } catch (e) {
            // ignore store errors and fallback to DB check
          }
          if (existingByIdempKey.has(idk)) {
            continue
          }
        }

        const ex = existingByCriterion.get(it.criterion)
        if (ex) {
          // if existing already has same value and idempotency key matches, skip
          if (idk && ex.idempotencyKey === idk && ex.value === it.value) {
            continue
          }
          ops.push(db.score.update({ where: { id: ex.id }, data: { value: it.value, comment: it.comment || null, updatedAt: new Date(), idempotencyKey: idk ?? undefined } }))
        } else {
          ops.push(db.score.create({ data: { eventId: it.eventId, participantId: it.participantId, judgeUserId: it.judgeUserId, criterion: it.criterion, value: it.value, comment: it.comment || null, idempotencyKey: idk ?? undefined } }))
        }
      }

      // apply all ops in a transaction
      if (ops.length > 0) {
        await db.$transaction(ops)
      }

      // update denormalized totalScore for this participant
      try {
        const agg = await db.score.aggregate({ where: { eventId, participantId }, _sum: { value: true } })
        const total = Math.floor(Number(agg._sum.value ?? 0))
        await db.participant.update({ where: { id: participantId }, data: { totalScore: total } })
        // Update Redis sorted-set and metadata for fast reads across instances
        try {
          if (redisClient) {
            try {
              const p = await db.participant.findUnique({ where: { id: participantId }, select: { id: true, name: true, kind: true } })
              if (p) {
                await redisClient.zadd(`lb:${eventId}`, total, String(participantId))
                await redisClient.hset(`lb:meta:${eventId}`, String(participantId), JSON.stringify({ id: p.id, name: p.name, kind: p.kind }))
              } else {
                await redisClient.zadd(`lb:${eventId}`, total, String(participantId))
              }
            } catch (e) {
              // ignore redis errors
            }
          }
        } catch (e) {
          // ignore
        }
        // mark idempotency keys applied in store
        for (const it of items) {
          const idk = (it as any).idempotencyKey
          if (idk) {
            try { await idempotencyStore.set(idk) } catch {}
          }
        }
      } catch (e) {
        console.error('Failed to update participant.totalScore in batch', e)
      }
    } catch (err) {
      console.error('Failed to process score batch group', key, err)
    }
  }

  // Broadcast trimmed leaderboards for events touched by this batch
  try {
    const TOP_N = 50
    for (const ev of eventsToBroadcast) {
      try {
        if (redisClient) {
          try {
            const z = await redisClient.zrevrange(`lb:${ev}`, 0, TOP_N - 1, 'WITHSCORES')
            const leaderboard: any[] = []
            for (let i = 0; i < z.length; i += 2) {
              const member = z[i]
              const score = Number(z[i + 1] || 0)
              let meta = null
              try {
                const m = await redisClient.hget(`lb:meta:${ev}`, member)
                if (m) meta = JSON.parse(m)
              } catch (e) { meta = null }
              leaderboard.push({ id: member, name: meta?.name ?? null, kind: meta?.kind ?? null, score, rank: leaderboard.length + 1 })
            }
            try { hub.broadcast('leaderboard', { eventSlug: ev, leaderboard, timestamp: new Date().toISOString() }) } catch (e) {}
            continue
          } catch (e) {
            // fallthrough to DB fallback
          }
        }

        const rows = await db.participant.findMany({ where: { eventId: ev }, orderBy: { totalScore: 'desc' }, take: TOP_N, select: { id: true, name: true, kind: true, totalScore: true } })
        const leaderboard = rows.map((r, i) => ({ id: r.id, name: r.name, kind: r.kind as any, score: Number(r.totalScore ?? 0), rank: i + 1 }))
        try { hub.broadcast('leaderboard', { eventSlug: ev, leaderboard, timestamp: new Date().toISOString() }) } catch (e) {}
      } catch (e) {
        console.error('Failed to fetch trimmed leaderboard for broadcast', ev, e)
      }
    }
  } catch (err) {
    console.error('Failed during batch broadcasts', err)
  }
}

