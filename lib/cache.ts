// Client-side cache for event data to speed up navigation with advanced features
export class EventCache {
  private static instance: EventCache
  private cache: Map<string, { data: any; timestamp: number; stale: number }>
  private pendingRequests: Map<string, Promise<any>>

  private constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
  }

  static getInstance(): EventCache {
    if (!EventCache.instance) {
      EventCache.instance = new EventCache()
    }
    return EventCache.instance
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000, staleTtl: number = 10 * 60 * 1000) {
    // TTL default 5 minutes, stale after 10 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
      stale: Date.now() + staleTtl,
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    
    // If data is stale, remove it
    if (now > item.stale) {
      this.cache.delete(key)
      return null
    }

    // Return even if expired but not stale (stale-while-revalidate pattern)
    return item.data
  }

  isExpired(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return true
    return Date.now() > item.timestamp
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key)
      this.pendingRequests.delete(key)
    } else {
      this.cache.clear()
      this.pendingRequests.clear()
    }
  }

  // Prefetch data for faster navigation with request deduplication
  async prefetch(url: string, key: string, force: boolean = false): Promise<any> {
    // Check if already cached and not expired
    if (!force && !this.isExpired(key)) {
      const cached = this.get(key)
      if (cached) return cached
    }

    // Check if there's already a pending request for this key (request deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    // Create new request
    const request = fetch(url)
      .then(async response => {
        if (response.ok) {
          const data = await response.json()
          this.set(key, data)
          return data
        }
        throw new Error(`Failed to fetch: ${response.status}`)
      })
      .catch(error => {
        console.error('Prefetch failed:', error)
        return null
      })
      .finally(() => {
        this.pendingRequests.delete(key)
      })

    this.pendingRequests.set(key, request)
    return request
  }

  // Batch prefetch multiple URLs
  async prefetchBatch(items: Array<{ url: string; key: string }>) {
    const promises = items.map(item => this.prefetch(item.url, item.key))
    return Promise.allSettled(promises)
  }
}

// Hook for using the cache with stale-while-revalidate
export function useCachedFetch<T>(
  url: string,
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; staleTtl?: number; revalidate?: boolean }
): { data: T | null; loading: boolean; error: Error | null; isStale: boolean } {
  const cache = EventCache.getInstance()
  const [data, setData] = React.useState<T | null>(cache.get(cacheKey))
  const [loading, setLoading] = React.useState(!data)
  const [error, setError] = React.useState<Error | null>(null)
  const [isStale, setIsStale] = React.useState(cache.isExpired(cacheKey))

  React.useEffect(() => {
    const cached = cache.get(cacheKey)
    const expired = cache.isExpired(cacheKey)

    if (cached) {
      setData(cached)
      setLoading(false)
      setIsStale(expired)
      
      // If expired but not stale, revalidate in background
      if (expired && options?.revalidate !== false) {
        fetcher()
          .then((result) => {
            cache.set(cacheKey, result, options?.ttl, options?.staleTtl)
            setData(result)
            setIsStale(false)
            setError(null)
          })
          .catch((err) => {
            // Keep stale data on error
            setError(err)
          })
      }
      return
    }

    // No cached data, fetch fresh
    setLoading(true)
    fetcher()
      .then((result) => {
        cache.set(cacheKey, result, options?.ttl, options?.staleTtl)
        setData(result)
        setIsStale(false)
        setError(null)
      })
      .catch((err) => {
        setError(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [url, cacheKey])

  return { data, loading, error, isStale }
}

import React from 'react'
