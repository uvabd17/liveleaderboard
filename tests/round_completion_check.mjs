import { PrismaClient } from '@prisma/client'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const EVENT_SLUG = 'demo-event'

async function run() {
  try {
    console.log('Fetching event...')
    const evtRes = await fetch(`${BASE}/api/events/${EVENT_SLUG}`)
    if (!evtRes.ok) throw new Error(`Failed to fetch event: ${evtRes.status}`)
    const evtJson = await evtRes.json()
    const event = evtJson.event
    if (!event) throw new Error('No event returned')
    console.log('Event id:', event.id)

    console.log('Fetching participants...')
    const pRes = await fetch(`${BASE}/api/events/${EVENT_SLUG}/participants`)
    if (!pRes.ok) throw new Error(`Failed to fetch participants: ${pRes.status}`)
    const pJson = await pRes.json()
    const participants = pJson.participants || []
    if (participants.length === 0) throw new Error('No participants found')
    const participant = participants[0]
    console.log('Using participant:', participant.id, participant.name)

    console.log('Fetching scoring schema...')
    const sRes = await fetch(`${BASE}/api/scoring-schema?eventSlug=${EVENT_SLUG}`)
    if (!sRes.ok) throw new Error(`Failed to fetch scoring schema: ${sRes.status}`)
    const sJson = await sRes.json()
    const rubric = Array.isArray(sJson.rubric) && sJson.rubric.length > 0 ? sJson.rubric : [{ key: 'innovation' }]
    const firstKey = rubric[0].key || rubric[0].name || 'innovation'
    console.log('Using criterion key:', firstKey)

    const scores = { [firstKey]: 1 }

    console.log('Submitting judge score POST...')
    const postRes = await fetch(`${BASE}/api/judge/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventSlug: EVENT_SLUG, participantId: participant.id, scores, comment: 'smoke-test', roundNumber: (event.currentRound ?? 0) + 1 })
    })
    console.log('POST status:', postRes.status)
    const postJson = await postRes.json().catch(()=> null)
    console.log('POST response:', postJson)

    console.log('Querying judge/score GET for participant...')
    const getRes = await fetch(`${BASE}/api/judge/score?participantId=${participant.id}`)
    console.log('GET status:', getRes.status)
    const getJson = await getRes.json().catch(()=>null)
    console.log('GET response:', getJson)

    console.log('Checking DB for RoundCompletion via Prisma client...')
    const prisma = new PrismaClient()
    const completions = await prisma.roundCompletion.findMany({ where: { eventId: event.id, participantId: participant.id } })
    console.log('Found round completions:', completions)
    await prisma.$disconnect()

    if (completions && completions.length > 0) {
      console.log('SUCCESS: RoundCompletion persisted')
      process.exit(0)
    } else {
      console.error('FAIL: No RoundCompletion rows found')
      process.exit(2)
    }
  } catch (err) {
    console.error('Test error:', err)
    process.exit(3)
  }
}

run()
