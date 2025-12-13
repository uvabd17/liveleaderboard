import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeName(name) {
  if (!name) return null;
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function main() {
  const participants = await prisma.participant.findMany({ where: { normalizedName: null } });
  console.log(`Found ${participants.length} participants to update`);
  for (const p of participants) {
    const normalized = normalizeName(p.name || '');
    try {
      await prisma.participant.update({ where: { id: p.id }, data: { normalizedName: normalized } });
      console.log(`Updated ${p.id} -> ${normalized}`);
    } catch (err) {
      console.error('Failed to update', p.id, err.message || err);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
