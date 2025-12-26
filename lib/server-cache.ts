// Simple server-side cache with in-memory + optional Redis adapter.
// Provides getOrSetWithSWR to return cached value and revalidate in background.
const DEFAULT_TTL_MS = Number(process.env.LEADERBOARD_CACHE_MS) || 15000
let redisClient: any = null
try {
  if (process.env.REDIS_URL) {
    // lazy require to avoid client-side bundling
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis')
    const redisOptions = {
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // don't retry, let it fail fast
      connectTimeout: 2000,
    }
    redisClient = new IORedis(process.env.REDIS_URL, redisOptions)
    redisClient.on('error', () => {
      // silently fail and fallback to in-memory
      redisAvailable = false
    })
    // subscribe to invalidation channel
    try {
      const sub = new IORedis(process.env.REDIS_URL, redisOptions)
      sub.on('error', () => { })
      sub.subscribe('lb:invalidate')
      sub.on('message', (channel: string, message: string) => {
        try {
          const payload = JSON.parse(message)
          if (!payload) return
          if (payload.key) {
            MEM.delete(payload.key)
          }
          if (payload.prefix) {
            // delete all mem cache entries that start with the prefix
            for (const k of Array.from(MEM.keys())) {
              if (k.startsWith(payload.prefix)) MEM.delete(k)
            }
          }
        } catch (e) {
          // parse error - ignore
        }
      })
    } catch (e) {
      // ignore subscription errors
    }
  }
} catch (e) {
  // ignore redis init errors and fallback to in-memory
}
// detect redis availability (best-effort)
let redisAvailable = false
  ; (async () => {
    if (!redisClient) return
    try {
      const pong = await redisClient.ping()
      redisAvailable = !!pong
      if (!redisAvailable) console.warn('server-cache: REDIS_URL set but ping failed, falling back to in-memory cache')
    } catch (e) {
      redisAvailable = false
      console.warn('server-cache: Redis ping failed, using in-memory cache')
    }
  })()

type CacheEntry = { expires: number; staleExpires: number; data: any }
const MEM: Map<string, CacheEntry> = new Map()
const REVALIDATING: Set<string> = new Set()

// Simple in-process metrics counters (can be swapped for Prometheus/OpenTelemetry)
export const metrics = {
  hits: 0,
  misses: 0,
  revalidated: 0,
}

function now() { return Date.now() }

async function redisGet(key: string) {
  if (!redisClient) return null
  try {
    const s = await redisClient.get(key)
    if (!s) return null
    return JSON.parse(s)
  } catch (e) {
    return null
  }
}

async function redisSet(key: string, value: any, ttlMs: number) {
  if (!redisClient) return false
  try {
    await redisClient.set(key, JSON.stringify(value), 'PX', String(ttlMs))
    return true
  } catch (e) {
    return false
  }
}

// publish invalidation message to channel for multi-instance invalidation
async function redisInvalidate(key: string) {
  if (!redisClient) return
  try {
    await redisClient.publish('lb:invalidate', JSON.stringify({ key }))
  } catch (e) {
    // ignore
  }
}

export async function get(key: string) {
  const k = `lb:${key}`
  let r = null
  if (redisAvailable) r = await redisGet(k)
  if (r) {
    metrics.hits++
    return r
  }
  const entry = MEM.get(k)
  if (!entry) {
    metrics.misses++
    return null
  }
  if (entry.expires <= now()) {
    // expired
    metrics.misses++
    return null
  }
  metrics.hits++
  return entry.data
}

export async function set(key: string, data: any, ttlMs: number = DEFAULT_TTL_MS) {
  const k = `lb:${key}`
  const staleWindow = Math.max(0, Math.floor(ttlMs * 2))
  // write to redis if available
  let didRedis = false
  if (redisAvailable) {
    didRedis = await redisSet(k, data, ttlMs).catch(() => false)
  }
  if (!didRedis) {
    MEM.set(k, { data, expires: now() + ttlMs, staleExpires: now() + ttlMs + staleWindow })
  }
  // publish invalidation so other instances can drop stale copies
  try { await redisInvalidate(k) } catch (e) { }
}

// getOrSetWithSWR: return cached if fresh; if expired but has stale copy, return stale and revalidate in background; otherwise compute, set, return.
export async function getOrSetWithSWR(key: string, fetcher: () => Promise<any>, ttlMs: number = DEFAULT_TTL_MS) {
  const k = `lb:${key}`
  // try redis first
  let r = null
  if (redisAvailable) r = await redisGet(k)
  if (r) return r

  const entry = MEM.get(k)
  const nowTs = now()
  if (entry) {
    if (entry.expires > nowTs) {
      metrics.hits++
      return entry.data
    }
    // expired but may be stale
    if (entry.staleExpires > nowTs) {
      metrics.revalidated++
      // kick off background refresh if not already running
      if (!REVALIDATING.has(k)) {
        REVALIDATING.add(k)
        fetcher()
          .then((res) => set(key, res, ttlMs))
          .catch(() => { })
          .finally(() => REVALIDATING.delete(k))
      }
      return entry.data
    }
    // fully stale
    MEM.delete(k)
  }

  // no cache - record miss, compute and set
  metrics.misses++
  const v = await fetcher()
  try { await set(key, v, ttlMs) } catch (e) { }
  return v
}

export function getMetrics() {
  return { ...metrics, redisAvailable }
}

export default { get, set, getOrSetWithSWR, getMetrics }
