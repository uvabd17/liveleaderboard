import { prisma } from '../../../../lib/db'
import { hub } from '../../../../lib/hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Joins a team using inviteCode; creates an individual participant linked in profile
export async function POST(request: Request) {
  try {
    const { teamId, inviteCode, name } = await request.json()
    if (!teamId || !inviteCode || !name) return Response.json({ error: 'invalid payload' }, { status: 400 })
    const team = await prisma.participant.findUnique({ where: { id: teamId }, include: { event: true } })
    if (!team || team.kind !== 'team' || (team.profile as any)?.inviteCode !== inviteCode) {
      return Response.json({ error: 'invalid_code' }, { status: 400 })
    }
    if (!team.event) return Response.json({ error: 'no_event' }, { status: 400 })
    const member = await prisma.participant.create({ data: { eventId: team.eventId, kind: 'individual', name, normalizedName: (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), profile: { teamId } } })
    // Optional: reflect membership in hub in-memory
    hub.upsertParticipant({ id: member.id, name: member.name, score: 0, kind: 'individual', createdAt: Date.now() })
    return Response.json({ ok: true, member })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
