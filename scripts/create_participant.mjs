import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const event = await prisma.event.findUnique({ where: { slug: 'demo-event' } })
  if (!event) {
    console.error('Event demo-event not found')
    process.exit(1)
  }

  const arg = process.argv[2]
  const name = arg || `Test Participant ${Math.floor(Math.random()*10000)}`
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ')
  const kind = 'individual'
  const accessToken = `p_${Date.now()}_${Math.random().toString(36).slice(2,10)}`

  const created = await prisma.participant.create({
    data: {
      eventId: event.id,
      name,
      normalizedName,
      kind,
      profile: { accessToken }
    }
  })

  console.log(JSON.stringify({ participant: created, accessToken }))
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
