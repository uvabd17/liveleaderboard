import { prisma } from '../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Ensure one user, one org and one event exist for local dev.
    const user = await prisma.user.upsert({
      where: { email: 'dev@local' },
      update: {},
      create: {
        id: 'dev_user',
        email: 'dev@local',
        name: 'Dev Local',
        password: 'changeme',
      }
    })

    const org = await prisma.organization.upsert({
      where: { slug: 'demo-org' },
      update: {},
      create: { slug: 'demo-org', name: 'Demo Org', ownerId: user.id }
    })
    const evt = await prisma.event.upsert({
      where: { slug: 'demo-event' },
      update: {},
      create: { slug: 'demo-event', name: 'Demo Event', orgId: org.id, visibility: 'public' }
    })
    return Response.json({ ok: true, organization: org, event: evt })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'seed_error' }, { status: 500 })
  }
}
