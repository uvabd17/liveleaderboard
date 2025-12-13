import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Simple .env loader (avoids adding dotenv dependency in test scripts)
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|(.*))\s*$/)
    if (m) {
      process.env.DATABASE_URL = m[1] ?? m[2] ?? m[3]
      break
    }
  }
}

async function run() {
  const prisma = new PrismaClient()
  try {
    const evt = await prisma.event.findUnique({ where: { slug: 'demo-event' } })
    if (!evt) {
      console.log('No demo-event found in DB')
      await prisma.$disconnect()
      process.exit(0)
    }
    console.log('Event id:', evt.id)
    const rows = await prisma.roundCompletion.findMany({ where: { eventId: evt.id } })
    console.log('RoundCompletion rows:', rows)
  } catch (err) {
    console.error('Error querying DB:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
