import { prisma } from '../../../../lib/db'
import { hub } from '../../../../lib/hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Creates a simple invite code for a team (stored on participant.profile)
export async function POST(request: Request) {
  try {
    const { teamId } = await request.json()
    if (!teamId) return Response.json({ error: 'invalid teamId' }, { status: 400 })
    const team = await prisma.participant.findUnique({ where: { id: teamId } })
    if (!team || team.kind !== 'team') return Response.json({ error: 'not_a_team' }, { status: 400 })
    const code = Math.random().toString(36).slice(2,8)
    const profile = { ...(team.profile as any || {}), inviteCode: code }
    await prisma.participant.update({ where: { id: teamId }, data: { profile } })
    return Response.json({ ok: true, inviteCode: code })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
