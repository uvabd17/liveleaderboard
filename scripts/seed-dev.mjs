import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await hash('devpass', 10)

  // Create organization first
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: { slug: 'demo-org', name: 'Demo Organization', ownerId: 'temp' },
  })

  // Create or update user with organization link
  const user = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: { 
      orgId: org.id,
      onboardingComplete: true,
      accountType: 'organization'
    },
    create: { 
      email: 'dev@example.com', 
      name: 'Dev User', 
      password: hashedPassword,
      orgId: org.id,
      onboardingComplete: true,
      accountType: 'organization'
    },
  })

  // Update org with correct ownerId
  await prisma.organization.update({
    where: { id: org.id },
    data: { ownerId: user.id }
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
      name: 'Demo Hackathon 2026', 
      description: 'A sample hackathon event showcasing the Live Leaderboard platform',
      orgId: org.id, 
      visibility: 'public',
      features: defaultFeatures,
      rules: {
        judgingMode: 'points',
        rubric: [
          { name: 'Innovation', maxPoints: 100, description: 'Creativity and uniqueness' },
          { name: 'Execution', maxPoints: 100, description: 'Quality and completeness' },
          { name: 'Presentation', maxPoints: 100, description: 'Demo and pitch quality' }
        ],
        rounds: [
          { id: 1, name: 'Qualifier Round' },
          { id: 2, name: 'Final Round' }
        ]
      }
    },
  })

  // Add sample participants
  const participants = [
    { name: 'Team Alpha', kind: 'team' },
    { name: 'Team Beta', kind: 'team' },
    { name: 'Team Gamma', kind: 'team' },
    { name: 'Solo Developer', kind: 'individual' },
    { name: 'Team Delta', kind: 'team' }
  ]

  for (const p of participants) {
    await prisma.participant.upsert({
      where: {
        eventId_normalizedName_kind: {
          eventId: evt.id,
          normalizedName: p.name.toLowerCase().replace(/\s+/g, '-'),
          kind: p.kind
        }
      },
      update: {},
      create: {
        eventId: evt.id,
        name: p.name,
        normalizedName: p.name.toLowerCase().replace(/\s+/g, '-'),
        kind: p.kind,
        totalScore: Math.floor(Math.random() * 300)
      }
    })
  }

  console.log('Seeded:', { organization: org.id, event: evt.id, participants: participants.length, features: 'initialized' })
}

main().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1) })
