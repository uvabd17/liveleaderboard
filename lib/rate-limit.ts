import { LRUCache } from 'lru-cache'

type RateLimitOptions = {
  interval?: number
  uniqueTokenPerInterval?: number
}

export function rateLimit(options?: RateLimitOptions) {
  const interval = options?.interval ?? 60_000
  const tokenCache = new LRUCache<string, { count: number } | undefined>({
    max: options?.uniqueTokenPerInterval ?? 500,
    ttl: interval,
  })

  return {
    async check(limit: number, token: string) {
      const existing = tokenCache.get(token) || { count: 0 }
      if (existing.count >= limit) {
        throw new Error('rate_limited')
      }
      existing.count += 1
      tokenCache.set(token, existing)
    }
  }
}

// convenience default limiter
export const defaultLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 1_000 })
