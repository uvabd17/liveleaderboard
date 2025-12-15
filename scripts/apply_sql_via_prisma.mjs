import fs from 'fs'

// load DATABASE_URL from .env
const env = fs.readFileSync('.env', 'utf8')
const m = env.match(/^\s*DATABASE_URL\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\r\n]*))/m)
const dbUrl = m && (m[1] || m[2] || m[3])
if (!dbUrl) {
  console.error('DATABASE_URL not found in .env')
  process.exit(1)
}
process.env.DATABASE_URL = dbUrl

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main(){
  try {
    console.log('Applying IdempotencyKey table SQL via Prisma...')
    await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "IdempotencyKey" ("key" text PRIMARY KEY, "expires_at" timestamptz)')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_idempotency_expires" ON "IdempotencyKey" ("expires_at")')
    console.log('Applied SQL successfully')
  } catch(e){
    console.error('Failed to apply SQL', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
