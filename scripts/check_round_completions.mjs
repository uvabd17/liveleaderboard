import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const event = await prisma.event.findUnique({ where: { slug: 'demo-event' } })
  if (!event) {
    console.error('Event demo-event not found')
    process.exit(1)
  }

  const rows = await prisma.roundCompletion.findMany({ where: { eventId: event.id } })
  console.log(JSON.stringify(rows, null, 2))
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
