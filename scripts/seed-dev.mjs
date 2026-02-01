import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await hash('devpass', 10)

  const user = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: { email: 'dev@example.com', name: 'Dev User', password: hashedPassword },
  })

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: { slug: 'demo-org', name: 'Demo Org', ownerId: user.id },
  })
  
  // Default features configuration - all disabled by default for opt-in approach
  const defaultFeatures = {
    presentation: {
      teamAvatars: false,
      stageDisplay: false,
      customThemes: false,
      podiumWinners: { enabled: false, topN: 3 },
    },
    competitive: {
      publicVoting: { enabled: false, weight: 20 },
      liveReactions: false,
      badgesAchievements: false,
      momentumIndicators: false,
    },
    judgeExperience: {
      judgeComments: false,
      bulkScoring: false,
      scoreHistory: false,
    },
    leaderboardVisibility: {
      scoreBreakdown: { enabled: false, detail: 'total' },
      activityFeed: false,
      historicalComparison: false,
    },
    operations: {
      scheduledActions: false,
      i18n: { enabled: false, languages: ['en'] },
      embedSupport: false,
      teamMessaging: false,
      predictiveRankings: false,
      printViews: false,
      participantProfiles: false,
      exportOnDemand: false,
    },
  }
  
  const evt = await prisma.event.upsert({
    where: { slug: 'demo-event' },
    update: { features: defaultFeatures },
    create: { 
      slug: 'demo-event', 
      name: 'Demo Event', 
      orgId: org.id, 
      visibility: 'public',
      features: defaultFeatures 
    },
  })
  console.log('Seeded:', { organization: org.id, event: evt.id, features: 'initialized' })
}

main().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1) })
