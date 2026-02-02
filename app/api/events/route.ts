import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any)

    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events = await db.event.findMany({
      where: { orgId: session.user.orgId },
      include: {
        _count: {
          select: {
            participants: true,
            judges: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const stats = {
      totalEvents: events.length,
      activeEvents: events.filter(e => !e.archived).length,
      totalParticipants: events.reduce((sum, e) => sum + e._count.participants, 0),
      totalJudges: events.reduce((sum, e) => sum + e._count.judges, 0),
    }

    return NextResponse.json({ events, stats })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    console.log('[API] POST /api/events - Starting request processing')
    const session: any = await getServerSession(authOptions as any)

    // #region agent log
    const fs = await import('fs/promises'); const logPath = 'd:\\Live Leaderboard\\.cursor\\debug.log'; const logEntry = JSON.stringify({location:'app/api/events/route.ts:42',message:'POST /api/events called',data:{hasSession:!!session,hasOrgId:!!session?.user?.orgId,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n'; await fs.appendFile(logPath, logEntry).catch(()=>{});
    // #endregion

    console.log('[API] Session check:', { hasSession: !!session, hasOrgId: !!session?.user?.orgId, userId: session?.user?.id })

    if (!session?.user?.orgId) {
      console.error('[API] Unauthorized - missing session or orgId')
      // #region agent log
      const fs2 = await import('fs/promises'); const logPath2 = 'd:\\Live Leaderboard\\.cursor\\debug.log'; const logEntry2 = JSON.stringify({location:'app/api/events/route.ts:46',message:'Unauthorized - missing session or orgId',data:{hasSession:!!session,hasOrgId:!!session?.user?.orgId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n'; await fs2.appendFile(logPath2, logEntry2).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check event limit (5 active events for free tier)
    const eventCount = await db.event.count({ 
      where: { 
        orgId: session.user.orgId,
        archived: false
      } 
    })
    if (eventCount >= 5) {
      return NextResponse.json({ 
        error: 'event_limit_reached', 
        message: 'You have reached the maximum of 5 active events on the free tier. Please archive an event or upgrade your plan.' 
      }, { status: 429 })
    }

    console.log('[API] Parsing request body...')
    let body
    try {
      body = await req.json()
      console.log('[API] Request body parsed successfully, keys:', Object.keys(body))
    } catch (parseError) {
      console.error('[API] Failed to parse JSON:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    const { name, description, startAt, endAt, timezone, visibility, logoUrl, brandColors, features, rules } = body

    // #region agent log
    const fs3 = await import('fs/promises'); const logPath3 = 'd:\\Live Leaderboard\\.cursor\\debug.log'; const logEntry3 = JSON.stringify({location:'app/api/events/route.ts:51',message:'Request body parsed',data:{hasName:!!name,nameLength:name?.length,hasDescription:!!description,hasLogoUrl:!!logoUrl,logoUrlLength:logoUrl?.length,hasBrandColors:!!brandColors,hasFeatures:!!features,hasRules:!!rules,rulesKeys:rules?Object.keys(rules):[],bodyKeys:Object.keys(body)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n'; await fs3.appendFile(logPath3, logEntry3).catch(()=>{});
    // #endregion

    console.log('[API] Extracted fields:', {
      hasName: !!name,
      name,
      hasLogoUrl: !!logoUrl,
      logoUrlLength: logoUrl?.length,
      hasBrandColors: !!brandColors,
      hasFeatures: !!features,
      hasRules: !!rules,
      rulesKeys: rules ? Object.keys(rules) : []
    })

    if (!name) {
      console.error('[API] Validation failed - name missing')
      // #region agent log
      const fs4 = await import('fs/promises'); const logPath4 = 'd:\\Live Leaderboard\\.cursor\\debug.log'; const logEntry4 = JSON.stringify({location:'app/api/events/route.ts:55',message:'Validation failed - name missing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n'; await fs4.appendFile(logPath4, logEntry4).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check slug uniqueness
    let slug = baseSlug
    let counter = 1
    while (await db.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Limit logoUrl size if too large (PostgreSQL TEXT has limits, and large data URLs can cause issues)
    let logoUrlToStore = logoUrl
    if (logoUrl && logoUrl.length > 1000000) { // 1MB limit for data URLs
      console.warn('[API] Logo URL too large, truncating:', logoUrl.length)
      logoUrlToStore = null
    }

    const eventData = {
      orgId: session.user.orgId,
      name,
      slug,
      description: description || null,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      timezone: timezone || 'UTC',
      visibility: visibility || 'public',
      logoUrl: logoUrlToStore || null,
      brandColors: brandColors || null,
      features: features || null,
      rules: rules || null,
    }

    console.log('[API] Attempting database create with data:', {
      orgId: eventData.orgId,
      name: eventData.name,
      slug: eventData.slug,
      hasLogoUrl: !!eventData.logoUrl,
      logoUrlLength: eventData.logoUrl?.length,
      hasBrandColors: !!eventData.brandColors,
      hasFeatures: !!eventData.features,
      hasRules: !!eventData.rules,
    })

    // #region agent log
    const fs5 = await import('fs/promises'); const logPath5 = 'd:\\Live Leaderboard\\.cursor\\debug.log'; const logEntry5 = JSON.stringify({location:'app/api/events/route.ts:69',message:'Attempting database create',data:{orgId:session.user.orgId,name,slug,hasLogoUrl:!!logoUrlToStore,logoUrlLength:logoUrlToStore?.length,hasBrandColors:!!brandColors,hasFeatures:!!features,hasRules:!!rules},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'; await fs5.appendFile(logPath5, logEntry5).catch(()=>{});
    // #endregion

    const event = await db.event.create({
      data: eventData
    })

    // #region agent log
    const fs6 = await import('fs/promises'); const logPath6 = 'd:\\Live Leaderboard\\.cursor\\debug.log'; const logEntry6 = JSON.stringify({location:'app/api/events/route.ts:87',message:'Event created successfully',data:{eventId:event.id,eventName:event.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'; await fs6.appendFile(logPath6, logEntry6).catch(()=>{});
    // #endregion

    return NextResponse.json({ event })
  } catch (error) {
    // #region agent log
    const fs7 = await import('fs/promises'); const logPath7 = 'd:\\Live Leaderboard\\.cursor\\debug.log'; const logEntry7 = JSON.stringify({location:'app/api/events/route.ts:90',message:'Exception in POST /api/events',data:{error:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined,errorName:error instanceof Error?error.name:undefined,errorCode:(error as any)?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'; await fs7.appendFile(logPath7, logEntry7).catch(()=>{});
    // #endregion
    console.error('[API] Failed to create event:', error)
    console.error('[API] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    })
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code
    const errorDetails: any = { details: errorMessage }
    if (errorCode) errorDetails.code = errorCode
    
    return NextResponse.json({ 
      error: 'Failed to create event',
      ...errorDetails
    }, { status: 500 })
  }
}
