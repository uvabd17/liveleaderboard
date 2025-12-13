import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeName(name) {
  if (!name) return null
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  console.log('Checking participants for null normalizedName and duplicates...')

  const nulls = await prisma.participant.findMany({ where: { normalizedName: null }, select: { id: true, name: true, eventId: true, kind: true } })
  console.log(`Found ${nulls.length} participants with null normalizedName`)
  for (const p of nulls) {
    const normalized = normalizeName(p.name || '')
    await prisma.participant.update({ where: { id: p.id }, data: { normalizedName: normalized } })
    console.log(`Backfilled ${p.id} -> ${normalized}`)
  }

  // Now find duplicates grouped by eventId, normalizedName, kind using JS
  const all = await prisma.participant.findMany({ select: { id: true, eventId: true, normalizedName: true, name: true, kind: true, createdAt: true } })
  const groups = new Map()
  for (const p of all) {
    if (!p.normalizedName) continue
    const key = `${p.eventId}||${p.normalizedName}||${p.kind}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }

  const duplicateGroups = Array.from(groups.entries()).filter(([, arr]) => arr.length > 1)
  console.log(`Found ${duplicateGroups.length} duplicate groups`)

  for (const [key, rows] of duplicateGroups) {
    const [eventId, normalizedName, kind] = key.split('||')
    console.log('Resolving duplicates for', eventId, normalizedName, kind, 'count=', rows.length)
    rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i]
      if (i === 0) continue // keep first
      // append suffix to make unique
      let suffix = 1
      let candidate = `${p.normalizedName}-${suffix}`
      // ensure not colliding
      while (await prisma.participant.findFirst({ where: { eventId: p.eventId, normalizedName: candidate, kind: p.kind } })) {
        suffix++
        candidate = `${p.normalizedName}-${suffix}`
      }
      await prisma.participant.update({ where: { id: p.id }, data: { normalizedName: candidate } })
      console.log(`Updated duplicate ${p.id}: ${p.normalizedName} -> ${candidate}`)
    }
  }

  console.log('Done. Re-checking duplicate groups...')
  const all2 = await prisma.participant.findMany({ select: { eventId: true, normalizedName: true, kind: true } })
  const groups2 = new Map()
  for (const p of all2) {
    if (!p.normalizedName) continue
    const key = `${p.eventId}||${p.normalizedName}||${p.kind}`
    groups2.set(key, (groups2.get(key) || 0) + 1)
  }
  const remain = Array.from(groups2.values()).filter(c => c > 1).length
  console.log(`Remaining duplicate groups: ${remain}`)

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
