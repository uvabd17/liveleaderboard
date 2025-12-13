import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const token = process.argv[2]
  const name = process.argv[3] || 'Smoke Test Team'
  const kind = process.argv[4] || 'team'

  if (!token) {
    console.error('Usage: node scripts/smoke_register.mjs <token> [name] [kind]')
    process.exit(1)
  }

  const reg = await prisma.registrationToken.findUnique({ where: { token } })
  if (!reg) {
    console.error('Token not found')
    process.exit(1)
  }

  if (reg.expiresAt && new Date(reg.expiresAt).getTime() < Date.now()) {
    console.error('Token expired')
    process.exit(1)
  }

  if (reg.usesLeft !== null && reg.usesLeft <= 0) {
    console.error('Token used up')
    process.exit(1)
  }

  // Duplicate check
  const normalized = name.trim()
  const existing = await prisma.participant.findFirst({ where: { eventId: reg.eventId, name: { equals: normalized, mode: 'insensitive' }, kind } })
  if (existing) {
    console.error('Duplicate name')
    process.exit(1)
  }

  const created = await prisma.participant.create({ data: { eventId: reg.eventId, name: normalized, kind } })

  if (reg.usesLeft === null) {
    // unlimited
  } else if (reg.usesLeft > 1) {
    await prisma.registrationToken.update({ where: { id: reg.id }, data: { usesLeft: reg.usesLeft - 1 } })
  } else {
    await prisma.registrationToken.update({ where: { id: reg.id }, data: { usesLeft: 0 } })
  }

  console.log('Registered participant:', created)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
