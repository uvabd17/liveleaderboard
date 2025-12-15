#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
import IORedis from 'ioredis'

const prisma = new PrismaClient()
const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')

console.log('Score worker started, connecting to Redis and DB...')

async function processItem(raw) {
  let item
  try { item = JSON.parse(raw) } catch (e) { return }
  const { eventId, participantId, judgeUserId, criterion, value, idempotencyKey, comment, eventSlug } = item

  try {
    // Attempt idempotency claim via Redis SET NX
    if (idempotencyKey) {
      const set = await redis.set(`idemp:${idempotencyKey}`, '1', 'PX', String(Number(process.env.IDEMPOTENCY_TTL_MS) || 86400000), 'NX')
      if (!set) {
        // already processed
        return
      }
    }

    // upsert score
    const existing = await prisma.score.findFirst({ where: { eventId, participantId, judgeUserId, criterion } })
    if (existing) {
      if (existing.value === value && (idempotencyKey ? existing.idempotencyKey === idempotencyKey : true)) {
        // nothing to do
      } else {
        await prisma.score.update({ where: { id: existing.id }, data: { value, comment: comment || null, updatedAt: new Date(), idempotencyKey: idempotencyKey ?? undefined } })
      }
    } else {
      await prisma.score.create({ data: { eventId, participantId, judgeUserId, criterion, value, comment: comment || null, idempotencyKey: idempotencyKey ?? undefined } })
    }

    // recompute total and update participant
    const agg = await prisma.score.aggregate({ where: { eventId, participantId }, _sum: { value: true } })
    const total = Math.floor(Number(agg._sum.value ?? 0))
    await prisma.participant.update({ where: { id: participantId }, data: { totalScore: total } })

    // update Redis leaderboard structures
    try {
      await redis.zadd(`lb:${eventId}`, total, String(participantId))
      const p = await prisma.participant.findUnique({ where: { id: participantId }, select: { id: true, name: true, kind: true } })
      if (p) await redis.hset(`lb:meta:${eventId}`, String(participantId), JSON.stringify(p))
    } catch (e) {
      // ignore
    }

    // publish trimmed leaderboard for this event
    try {
      const TOP_N = Number(process.env.SCORE_WORKER_TOP_N) || 50
      const z = await redis.zrevrange(`lb:${eventId}`, 0, TOP_N - 1, 'WITHSCORES')
      const leaderboard = []
      for (let i = 0; i < z.length; i += 2) {
        const member = z[i]
        const score = Number(z[i + 1] || 0)
        let meta = null
        try { const m = await redis.hget(`lb:meta:${eventId}`, member); if (m) meta = JSON.parse(m) } catch {}
        leaderboard.push({ id: member, name: meta?.name ?? null, kind: meta?.kind ?? null, score, rank: leaderboard.length + 1 })
      }
      const payload = { type: 'leaderboard', eventSlug: eventSlug || null, eventId, leaderboard, timestamp: new Date().toISOString(), instanceId: process.env.HUB_INSTANCE_ID || 'worker' }
      try { await redis.publish('hub:pub', JSON.stringify(payload)) } catch (e) {}
    } catch (e) {
      // ignore
    }
  } catch (err) {
    console.error('Error processing score item', err)
  }
}

async function loop() {
  while (true) {
    try {
      const res = await redis.brpop('score_queue', 0)
      if (res && res[1]) {
        await processItem(res[1])
      }
    } catch (e) {
      console.error('Worker loop error', e)
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

loop().catch(e => { console.error(e); process.exit(1) })
