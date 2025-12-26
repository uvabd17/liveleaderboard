import { hub } from '../../../lib/hub'
// Optional Redis client to publish cache invalidation when present
let redisClient: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const IORedis = require('ioredis')
  if (process.env.REDIS_URL) redisClient = new IORedis(process.env.REDIS_URL)
} catch (e) {}

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, delta } = body
    if (typeof id !== 'string' || typeof delta !== 'number') {
      return Response.json({ error: 'invalid payload' }, { status: 400 })
    }
    hub.updateScore(id, delta)
    try {
      // attempt best-effort invalidation using id as participant or parse eventSlug if available
      if (redisClient && typeof id === 'string') {
        // publish a generic event-level invalidation; hub.updateScore may include event info in future
        // best-effort: publish without prefix if unknown
        await redisClient.publish('lb:invalidate', JSON.stringify({ key: `lb:${id}` }))
      }
    } catch (e) {}
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
