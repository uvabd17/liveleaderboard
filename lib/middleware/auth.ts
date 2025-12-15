import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export interface AuthContext {
  userId: string
  email: string
  orgId: string | null
  isAdmin: boolean
}

/**
 * Middleware to verify user is authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return null
  }

  const userId = session.user.id as string
  const email = session.user.email as string

  // Fetch user to get orgId
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, orgId: true, ownedOrgs: { select: { id: true } } }
  })

  if (!user) {
    return null
  }

  return {
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
    isAdmin: !!user.orgId || (user.ownedOrgs?.length ?? 0) > 0
  }
}

/**
 * Middleware to verify user has access to an event (admin or judge)
 */
export async function requireEventAccess(
  request: NextRequest,
  eventSlug: string
): Promise<{ auth: AuthContext; event: any } | null> {
  const auth = await requireAuth(request)
  if (!auth) {
    return null
  }

  const event = await db.event.findUnique({
    where: { slug: eventSlug },
    include: { organization: true, judges: true }
  })

  if (!event) {
    return null
  }

  // Check if user is admin (org member or owner)
  const isOrgMember = auth.orgId === event.orgId
  const isOwner = event.organization.ownerId === auth.userId
  const isAdmin = isOrgMember || isOwner

  // Check if user is a judge
  const isJudge = event.judges.some(
    judge => judge.email === auth.email && judge.active
  )

  if (!isAdmin && !isJudge) {
    return null
  }

  return { auth, event }
}

/**
 * Middleware to verify user is admin for an event
 */
export async function requireEventAdmin(
  request: NextRequest,
  eventSlug: string
): Promise<{ auth: AuthContext; event: any } | null> {
  const auth = await requireAuth(request)
  if (!auth) {
    return null
  }

  const event = await db.event.findUnique({
    where: { slug: eventSlug },
    include: { organization: true }
  })

  if (!event) {
    return null
  }

  // Check if user is admin (org member or owner)
  const isOrgMember = auth.orgId === event.orgId
  const isOwner = event.organization.ownerId === auth.userId

  if (!isOrgMember && !isOwner) {
    return null
  }

  return { auth, event }
}

/**
 * Helper to return 401 Unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
}

/**
 * Helper to return 403 Forbidden response
 */
export function forbiddenResponse() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

