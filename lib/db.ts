import { PrismaClient } from '@prisma/client'

const globalAny = globalThis as any

// Prisma client with connection pooling for production
export const prisma: PrismaClient = globalAny.__PRISMA__ || new PrismaClient({
  // Avoid noisy query logging in development — keep warnings and errors only
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  // Connection pool configuration for production scale
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
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
