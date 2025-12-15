import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting totalScore backfill...')
  const events = await prisma.event.findMany({ select: { id: true, slug: true } })
  for (const evt of events) {
    console.log(`Backfilling event ${evt.slug} (${evt.id})`)
    const rows = await prisma.$queryRaw`
      SELECT "participantId" as id, COALESCE(SUM(value), 0)::int as total
      FROM "Score"
      WHERE "eventId" = ${evt.id}
      GROUP BY "participantId"
    `
    let updated = 0
    for (const r of rows) {
      try {
        await prisma.$executeRaw`
          UPDATE "Participant"
          SET "totalScore" = ${Number(r.total)}
          WHERE id = ${r.id}
        `
        updated++
      } catch (e) {
        console.warn('Failed to update participant', r.id, e.message)
      }
    }
    console.log(`Updated ${updated} participants for event ${evt.slug}`)
  }
  console.log('Backfill complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
