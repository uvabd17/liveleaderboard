import { PrismaClient } from '@prisma/client'

const globalAny = globalThis as any

export const prisma: PrismaClient = globalAny.__PRISMA__ || new PrismaClient()
if (!globalAny.__PRISMA__) {
  globalAny.__PRISMA__ = prisma
}

// Export as db for backwards compatibility
export const db = prisma
