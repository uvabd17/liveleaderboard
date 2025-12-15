import { PrismaClient } from '@prisma/client'
import { spawnSync } from 'child_process'

const prisma = new PrismaClient()

async function main() {
  console.log('\n== Apply totalScore column + index (if missing) ==')
  try {
    console.log('Adding column totalScore (IF NOT EXISTS)')
    await prisma.$executeRawUnsafe('ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "totalScore" integer DEFAULT 0')
  } catch (e) {
    console.error('ALTER TABLE failed:', e.message || e)
    throw e
  }

  try {
    console.log('Creating index on (eventId, totalScore) (IF NOT EXISTS)')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_participant_event_totalscore" ON "Participant" ("eventId", "totalScore" DESC)')
  } catch (e) {
    console.error('CREATE INDEX failed:', e.message || e)
    throw e
  }

  console.log('\n== Running backfill_total_score.mjs ==')
  const res = spawnSync(process.execPath, ['scripts/backfill_total_score.mjs'], { stdio: 'inherit', cwd: process.cwd() })
  if (res.error) {
    console.error('Backfill process error:', res.error)
    throw res.error
  }
  if (res.status !== 0) {
    throw new Error('Backfill script exited with code ' + res.status)
  }

  console.log('\nMigration + backfill completed successfully')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
