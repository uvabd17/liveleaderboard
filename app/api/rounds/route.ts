import { prisma } from '../../../lib/db'
import { hub } from '../../../lib/hub'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: fetch round config and current round
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventSlug = searchParams.get('eventSlug')
    if (!eventSlug) {
      return Response.json({ error: 'eventSlug required' }, { status: 400 })
    }

    const evt = await prisma.event.findUnique({ where: { slug: eventSlug } })
    if (!evt) return Response.json({ error: 'no_event' }, { status: 400 })

    const rules = (evt.rules as any) || {}
    const roundsConfig = (rules.rounds || []).map((r: any) => ({
      ...r,
      judgingOpen: r.judgingOpen ?? false,
      judgingWindowMinutes: r.judgingWindowMinutes ?? null,
      roundDurationMinutes: r.roundDurationMinutes ?? r.duration ?? null,
      judgingOpenedAt: r.judgingOpenedAt ?? null,
    }))
    const eliminationConfig = rules.elimination || { enabled: false, cutoffRound: 0, bottomPercent: 0 }

    return Response.json({
      currentRound: evt.currentRound ?? 0,
      rounds: roundsConfig,
      elimination: eliminationConfig,
      total: roundsConfig.length,
    })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

// POST: manage round transitions
export async function POST(request: Request) {
  try {
    // Require admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return Response.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { action, eventSlug, roundConfig, eliminationConfig: elimConfigBody, judging } = body as {
      action: 'next' | 'prev' | 'set' | 'configure' | 'judging' | 'pause' | 'resume' | 'start' | 'stop'
      eventSlug?: string
      roundConfig?: {
        number: number
        name: string
        durationMinutes?: number
        roundDurationMinutes?: number
        description?: string
        judgingOpen?: boolean
        judgingWindowMinutes?: number | null
      }
      eliminationConfig?: { enabled: boolean; cutoffRound: number; bottomPercent: number }
      judging?: { roundNumber: number; open?: boolean; windowMinutes?: number | null }
    }

    const slug = eventSlug
    if (!slug) {
      return Response.json({ error: 'eventSlug required' }, { status: 400 })
    }
    const evt = await prisma.event.findUnique({ where: { slug }, include: { organization: true } })
    if (!evt) return Response.json({ error: 'no_event' }, { status: 400 })

    // Verify user has access to this event (must be org member or owner)
    const userId = session.user.id as string
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { ownedOrgs: true }
    })

    if (!user) {
      return Response.json({ error: 'user_not_found' }, { status: 404 })
    }

    const isOwner = evt.organization.ownerId === userId
    const isOrgMember = user.orgId === evt.orgId || user.ownedOrgs.some(org => org.id === evt.orgId)

    if (!isOwner && !isOrgMember) {
      return Response.json({ error: 'forbidden - not authorized for this event' }, { status: 403 })
    }

    const rules = (evt.rules as any) || {}
    let roundsConfig: any[] = (rules.rounds || []).map((r: any) => ({
      ...r,
      judgingOpen: r.judgingOpen ?? false,
      judgingWindowMinutes: r.judgingWindowMinutes ?? null,
      roundDurationMinutes: r.roundDurationMinutes ?? r.duration ?? null,
      judgingOpenedAt: r.judgingOpenedAt ?? null,
    }))
    let eliminationConfig = rules.elimination || { enabled: false, cutoffRound: 0, bottomPercent: 0 }
    let currentRound = evt.currentRound ?? 0

    if (action === 'next') {
      currentRound = Math.min(currentRound + 1, roundsConfig.length)
      // Start timer for the newly advanced round if not already started
      const newIdx = currentRound
      if (roundsConfig[newIdx]) {
        roundsConfig[newIdx].timerStartedAt = roundsConfig[newIdx].timerStartedAt || new Date().toISOString()
        roundsConfig[newIdx].timerPausedAt = roundsConfig[newIdx].timerPausedAt || null
        roundsConfig[newIdx].timerRunning = true
      }
      // If elimination enabled and cutoff reached, eliminate bottom participants
      if (eliminationConfig.enabled && currentRound > eliminationConfig.cutoffRound) {
        await eliminateBottomParticipants(evt.id, eliminationConfig.bottomPercent)
      }
    } else if (action === 'prev') {
      currentRound = Math.max(currentRound - 1, 0)
    } else if (action === 'set') {
      const num = (body as any).roundNumber
      currentRound = Math.max(0, Math.min(num, roundsConfig.length))
      // Support legacy 'set' behavior: start timer if not yet started
      if (roundsConfig[currentRound] && !roundsConfig[currentRound].timerStartedAt) {
        roundsConfig[currentRound].timerStartedAt = new Date().toISOString()
        roundsConfig[currentRound].timerPausedAt = null
        roundsConfig[currentRound].timerRunning = true
      }
    } else if (action === 'configure') {
      if (roundConfig) {
        // Validate timer fields
        if (roundConfig.roundDurationMinutes !== undefined && roundConfig.roundDurationMinutes < 0) {
          return Response.json({ error: 'Round duration must be positive' }, { status: 400 })
        }
        if (roundConfig.judgingWindowMinutes !== undefined && roundConfig.judgingWindowMinutes !== null && roundConfig.judgingWindowMinutes < 0) {
          return Response.json({ error: 'Judging window must be positive' }, { status: 400 })
        }

        const idx = roundConfig.number
        if (idx >= 0 && idx < roundsConfig.length) {
          roundsConfig[idx] = {
            ...roundsConfig[idx],
            ...roundConfig,
            duration: roundConfig.roundDurationMinutes ?? roundConfig.durationMinutes ?? roundsConfig[idx].duration,
            roundDurationMinutes: roundConfig.roundDurationMinutes ?? roundConfig.durationMinutes ?? roundsConfig[idx].roundDurationMinutes
          }
        } else if (idx === roundsConfig.length) {
          roundsConfig.push({
            ...roundConfig,
            judgingOpen: roundConfig.judgingOpen ?? false,
            judgingWindowMinutes: roundConfig.judgingWindowMinutes ?? null,
            duration: roundConfig.roundDurationMinutes ?? roundConfig.durationMinutes ?? 60,
            roundDurationMinutes: roundConfig.roundDurationMinutes ?? roundConfig.durationMinutes ?? 60,
            judgingOpenedAt: null
          })
        }
      }
      if (elimConfigBody) {
        eliminationConfig = { ...eliminationConfig, ...elimConfigBody }
        rules.elimination = eliminationConfig
      }
    } else if (action === 'judging' && judging) {
      if (judging.windowMinutes !== undefined && judging.windowMinutes !== null && judging.windowMinutes < 0) {
        return Response.json({ error: 'Judging window must be positive' }, { status: 400 })
      }

      const idx = judging.roundNumber
      if (idx >= 0 && idx < roundsConfig.length) {
        roundsConfig[idx] = {
          ...roundsConfig[idx],
          judgingOpen: judging.open ?? roundsConfig[idx].judgingOpen ?? false,
          judgingWindowMinutes: typeof judging.windowMinutes === 'number' ? judging.windowMinutes : (judging.windowMinutes ?? roundsConfig[idx].judgingWindowMinutes ?? null),
          judgingOpenedAt: (judging.open === true) ? new Date().toISOString() : (judging.open === false ? null : roundsConfig[idx].judgingOpenedAt ?? null),
        }
      }
    }
    else if (action === 'pause' || action === 'resume') {
      const idx = (body as any).roundNumber
      if (typeof idx === 'number' && idx >= 0 && idx < roundsConfig.length) {
        if (action === 'pause') {
          roundsConfig[idx] = {
            ...roundsConfig[idx],
            timerPausedAt: new Date().toISOString(),
            timerRunning: false,
          }
        } else {
          // resume - adjust startedAt to account for pause duration
          const oldStartedAt = roundsConfig[idx].timerStartedAt
          const pausedAt = roundsConfig[idx].timerPausedAt
          
          if (!oldStartedAt) {
            // If never started, start fresh
            roundsConfig[idx] = {
              ...roundsConfig[idx],
              timerStartedAt: new Date().toISOString(),
              timerPausedAt: null,
              timerRunning: true,
            }
          } else if (pausedAt) {
            // Calculate how long the timer was paused
            const pauseDuration = new Date().getTime() - new Date(pausedAt).getTime()
            // Adjust the start time forward by the pause duration
            const newStartedAt = new Date(new Date(oldStartedAt).getTime() + pauseDuration).toISOString()
            
            roundsConfig[idx] = {
              ...roundsConfig[idx],
              timerPausedAt: null,
              timerStartedAt: newStartedAt,
              timerRunning: true,
            }
          } else {
            // Already running, just ensure state is correct
            roundsConfig[idx] = {
              ...roundsConfig[idx],
              timerRunning: true,
            }
          }
        }
      }
    }
    else if (action === 'start') {
      const idx = (body as any).roundNumber
      if (typeof idx === 'number' && idx >= 0 && idx < roundsConfig.length) {
        // Start timer from fresh or resume if already paused
        if (!roundsConfig[idx].timerStartedAt) {
          roundsConfig[idx] = {
            ...roundsConfig[idx],
            timerStartedAt: new Date().toISOString(),
            timerPausedAt: null,
            timerRunning: true,
          }
        } else if (roundsConfig[idx].timerPausedAt) {
          // Resume from pause
          const pausedAt = roundsConfig[idx].timerPausedAt
          const oldStartedAt = roundsConfig[idx].timerStartedAt
          const pauseDuration = new Date().getTime() - new Date(pausedAt!).getTime()
          const newStartedAt = new Date(new Date(oldStartedAt!).getTime() + pauseDuration).toISOString()
          
          roundsConfig[idx] = {
            ...roundsConfig[idx],
            timerStartedAt: newStartedAt,
            timerPausedAt: null,
            timerRunning: true,
          }
        }
      }
    }
    else if (action === 'stop') {
      const idx = (body as any).roundNumber
      if (typeof idx === 'number' && idx >= 0 && idx < roundsConfig.length) {
        // Stop and reset timer
        roundsConfig[idx] = {
          ...roundsConfig[idx],
          timerStartedAt: null,
          timerPausedAt: null,
          timerRunning: false,
        }
      }
    }

    rules.rounds = roundsConfig
    await prisma.event.update({
      where: { id: evt.id },
      data: { rules, currentRound },
    })

    // Broadcast round change
    hub.broadcastRoundChange({
      eventSlug: slug,
      currentRound,
      roundsConfig,
      eliminationConfig,
      leaderboard: Array.from(hub.state.participants.values()).map(p => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        score: p.score,
      })),
    })

    return Response.json({ ok: true, currentRound, rounds: roundsConfig })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

// Helper: eliminate bottom X% of participants (for elimination-style tournaments)
async function eliminateBottomParticipants(eventId: string, bottomPercent: number) {
  try {
    const participants = await prisma.participant.findMany({ where: { eventId } })
    if (participants.length === 0) return

    const scores: Record<string, number> = {}
    for (const p of participants) {
      const agg = await prisma.score.aggregate({
        _sum: { value: true },
        where: { eventId, participantId: p.id },
      })
      scores[p.id] = agg._sum.value ?? 0
    }

    const sorted = participants.sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    const cutoff = Math.ceil(sorted.length * (bottomPercent / 100))
    const toEliminate = sorted.slice(-cutoff).map(p => p.id)

    // Mark as eliminated in profile
    for (const id of toEliminate) {
      const p = await prisma.participant.findUnique({ where: { id } })
      if (p) {
        const profile = (p.profile as any) || {}
        profile.eliminated = true
        await prisma.participant.update({ where: { id }, data: { profile } })
        // Remove from hub
        hub.state.participants.delete(id)
      }
    }
  } catch (e: any) {
    console.error('Elimination error:', e)
  }
}
