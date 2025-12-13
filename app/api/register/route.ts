import { hub } from '../../../lib/hub'
import { db } from '../../../lib/db'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, name, kind } = body as { token: string; name: string; kind: 'team' | 'individual' }
    if (!token || !name || (kind !== 'team' && kind !== 'individual')) {
      return Response.json({ error: 'invalid payload' }, { status: 400 })
    }
    const normalized = name.trim()
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ')
    if (normalized.length < 2) {
      return Response.json({ error: 'name_too_short' }, { status: 400 })
    }

    // Find registration token in DB
    let reg: any = null
    try {
      reg = await db.registrationToken.findUnique({ where: { token } })
    } catch (e) {
      // ignore
    }

    if (!reg) {
      // Fallback to hub token (demo)
      const pFallback = hub.registerWithToken(token, name, kind)
      if (!pFallback) return Response.json({ error: 'invalid_or_used_token' }, { status: 400 })
      // Note: Fallback hub registration doesn't persist to DB
      // Participants should use valid registration tokens
      return Response.json({ ok: true, participant: pFallback })
    }

    // Fetch event to enforce registration windows/locks
    const event = await db.event.findUnique({ where: { id: reg.eventId } })
    if (!event) {
      return Response.json({ error: 'event_not_found' }, { status: 404 })
    }
    const rules = (event.rules || {}) as any
    const now = Date.now()
    const isClosedByRule = rules?.registrationClosed === true
    const isClosedByEnd = event.endAt ? new Date(event.endAt).getTime() < now : false
    if (isClosedByRule || isClosedByEnd) {
      return Response.json({ error: 'registration_closed' }, { status: 403 })
    }

    // validate token expiration and uses
    if (reg.expiresAt && new Date(reg.expiresAt).getTime() < Date.now()) {
      return Response.json({ error: 'token_expired' }, { status: 410 })
    }
    if (reg.usesLeft !== null && reg.usesLeft <= 0) {
      return Response.json({ error: 'token_used_up' }, { status: 409 })
    }

    // Duplicate detection against DB using normalizedName (best-effort)
    try {
      const existing = await db.participant.findFirst({
        where: {
          eventId: reg.eventId,
          normalizedName: normalizedName,
          kind,
        },
      })
      if (existing) {
        return Response.json({ error: 'duplicate_name', message: 'Name already taken' }, { status: 409 })
      }
    } catch (e) {
      // ignore DB lookup failures; we'll rely on DB constraints later
    }

    // Also check hub participants (best-effort)
    for (const p of hub.state.participants.values()) {
      if (p.kind === kind && p.name.trim().toLowerCase() === normalized.toLowerCase()) {
        return Response.json({ error: 'duplicate_name', message: 'Name already taken' }, { status: 409 })
      }
    }

    // Generate unique access token for participant
    const generateAccessToken = () => {
      return `p_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`
    }
    const accessToken = generateAccessToken()

    // Create participant and update token atomically where possible
    let created: any = null
    try {
      if (reg.usesLeft === null) {
        created = await db.participant.create({ 
          data: { 
            eventId: reg.eventId, 
            name: normalized, 
            normalizedName, 
            kind,
            profile: {
              accessToken,
            }
          } 
        })
        // increment registrationsCount for analytics
        await db.registrationToken.update({ where: { id: reg.id }, data: { registrationsCount: { increment: 1 } } })
      } else {
        created = await db.$transaction(async (tx) => {
          const p = await tx.participant.create({ 
            data: { 
              eventId: reg.eventId, 
              name: normalized, 
              normalizedName, 
              kind,
              profile: {
                accessToken,
              }
            } 
          })
          const newUses = reg.usesLeft > 1 ? reg.usesLeft - 1 : 0
          await tx.registrationToken.update({ where: { id: reg.id }, data: { usesLeft: newUses, registrationsCount: { increment: 1 } } })
          return p
        })
      }
    } catch (e: any) {
      // Handle unique constraint (duplicate participant) gracefully
      if (e?.code === 'P2002') {
        return Response.json({ error: 'duplicate_name', message: 'Name already taken' }, { status: 409 })
      }
      throw e
    }

    // Broadcast to hub for real-time leaderboard
    try {
      hub.upsertParticipant({ id: created.id, name: created.name, score: 0, kind: created.kind as any, createdAt: created.createdAt ? new Date(created.createdAt).getTime() : Date.now() })
    } catch {}

    // Return participant with access token (only on initial registration)
    const responseData: any = { ...created }
    if (created.profile && typeof created.profile === 'object' && (created.profile as any).accessToken) {
      responseData.accessToken = (created.profile as any).accessToken
    }
    
    return Response.json({ ok: true, participant: responseData })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
