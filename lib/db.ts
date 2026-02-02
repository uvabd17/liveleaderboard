import { PrismaClient } from '@prisma/client'

const globalAny = globalThis as any

// Configure DATABASE_URL for serverless with pgBouncer (Supabase Pooler)
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  
  // In production serverless (Vercel), add pgbouncer=true to disable prepared statements
  if (process.env.VERCEL && url.includes('pooler.supabase.com')) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}pgbouncer=true&connection_limit=1`
  }
  
  return url
}

// Prisma client with connection pooling for production
export const prisma: PrismaClient = globalAny.__PRISMA__ || new PrismaClient({
  // Avoid noisy query logging in development — keep warnings and errors only
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  // Connection pool configuration for production scale
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

if (!globalAny.__PRISMA__) {
  globalAny.__PRISMA__ = prisma
}

// Export as db for backwards compatibility
export const db = prisma

// Helper to handle query timeouts (if needed)
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Query timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ])
}
