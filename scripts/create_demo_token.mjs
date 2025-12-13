import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const event = await prisma.event.findFirst()
  if (!event) {
    console.error('No event found in DB. Create an event first.')
    process.exit(1)
  }

  const token = crypto.randomBytes(8).toString('hex')

  // Ensure we have a user to attribute token creation
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({ data: { email: `dev+${Date.now()}@example.com`, name: 'Dev', password: 'devpass' } })
  }

  const rec = await prisma.registrationToken.create({
    data: {
      token,
      eventId: event.id,
      createdById: user.id,
      usesLeft: 10,
      singleUse: false,
    }
  })

  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = `${base}/e/${event.slug}/register?token=${encodeURIComponent(token)}`

  console.log(JSON.stringify({ token: rec.token, url }, null, 2))
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
