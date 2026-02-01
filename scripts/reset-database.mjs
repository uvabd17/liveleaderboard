/**
 * Database Reset Script - Nuclear Option
 * Completely wipes all data and optionally seeds fresh demo data
 * 
 * Usage (Windows):
 *   node scripts/reset-database.mjs
 *   node scripts/reset-database.mjs --seed
 *   node scripts/reset-database.mjs --confirm
 *   node scripts/reset-database.mjs --confirm --seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'demo123456' // For test accounts

async function resetDatabase() {
  console.log('\n🚨 DATABASE RESET SCRIPT 🚨\n')
  console.log('This will DELETE ALL DATA from the following tables:')
  console.log('  - AuditLog')
  console.log('  - Submission')
  console.log('  - RoundCompletion')
  console.log('  - Score')
  console.log('  - RegistrationToken')
  console.log('  - JudgeInvite')
  console.log('  - Judge')
  console.log('  - Participant')
  console.log('  - Event')
  console.log('  - Organization')
  console.log('  - User')
  console.log('')

  // Check for --confirm flag
  const args = process.argv.slice(2)
  if (!args.includes('--confirm')) {
    console.log('⚠️  Add --confirm flag to execute the reset')
    console.log('   Example: node scripts/reset-database.mjs --confirm')
    console.log('')
    process.exit(0)
  }

  console.log('⏳ Starting database wipe...\n')

  try {
    // Delete in order of dependencies (children first)
    console.log('  Deleting AuditLog...')
    const auditCount = await prisma.auditLog.deleteMany()
    console.log(`    ✓ Deleted ${auditCount.count} audit logs`)

    console.log('  Deleting Submission...')
    const subCount = await prisma.submission.deleteMany()
    console.log(`    ✓ Deleted ${subCount.count} submissions`)

    console.log('  Deleting RoundCompletion...')
    const rcCount = await prisma.roundCompletion.deleteMany()
    console.log(`    ✓ Deleted ${rcCount.count} round completions`)

    console.log('  Deleting Score...')
    const scoreCount = await prisma.score.deleteMany()
    console.log(`    ✓ Deleted ${scoreCount.count} scores`)

    console.log('  Deleting RegistrationToken...')
    const rtCount = await prisma.registrationToken.deleteMany()
    console.log(`    ✓ Deleted ${rtCount.count} registration tokens`)

    console.log('  Deleting JudgeInvite...')
    const jiCount = await prisma.judgeInvite.deleteMany()
    console.log(`    ✓ Deleted ${jiCount.count} judge invites`)

    console.log('  Deleting Judge...')
    const judgeCount = await prisma.judge.deleteMany()
    console.log(`    ✓ Deleted ${judgeCount.count} judges`)

    console.log('  Deleting Participant...')
    const partCount = await prisma.participant.deleteMany()
    console.log(`    ✓ Deleted ${partCount.count} participants`)

    console.log('  Deleting Event...')
    const eventCount = await prisma.event.deleteMany()
    console.log(`    ✓ Deleted ${eventCount.count} events`)

    console.log('  Deleting Organization...')
    const orgCount = await prisma.organization.deleteMany()
    console.log(`    ✓ Deleted ${orgCount.count} organizations`)

    console.log('  Deleting User...')
    const userCount = await prisma.user.deleteMany()
    console.log(`    ✓ Deleted ${userCount.count} users`)

    console.log('\n✅ Database wiped successfully!\n')

    // Optional seeding
    if (args.includes('--seed')) {
      await seedDemoData()
    }

  } catch (error) {
    console.error('\n❌ Error during database reset:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function seedDemoData() {
  console.log('🌱 Seeding demo data...\n')

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12)

  // Create demo admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Demo Admin',
    }
  })
  console.log(`  ✓ Created admin user: admin@demo.com (password: ${DEMO_PASSWORD})`)

  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Organization',
      slug: 'demo-org',
      ownerId: adminUser.id,
    }
  })

  // Link user to org
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { orgId: org.id }
  })
  console.log(`  ✓ Created organization: Demo Organization (slug: demo-org)`)

  // Create demo event
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      name: 'Demo Hackathon 2026',
      slug: 'demo-hackathon-2026',
      description: 'A demonstration event for testing the Live Leaderboard platform',
      visibility: 'public',
      currentRound: 1,
      rules: {
        judgingMode: 'panel',
        rubric: [
          { key: 'innovation', label: 'Innovation', max: 100, weight: 1, description: 'Creativity and originality of the solution' },
          { key: 'execution', label: 'Execution', max: 100, weight: 1, description: 'Quality of implementation' },
          { key: 'presentation', label: 'Presentation', max: 100, weight: 1, description: 'Clarity and effectiveness of demo' },
        ],
        rounds: [
          { number: 1, name: 'Round 1 - Pitches', roundDurationMinutes: 60, judgingOpen: true },
          { number: 2, name: 'Round 2 - Finals', roundDurationMinutes: 30, judgingOpen: false },
        ]
      },
      features: {
        allowSelfRegistration: true,
        showLeaderboard: true,
        requireApproval: false,
      }
    }
  })
  console.log(`  ✓ Created event: Demo Hackathon 2026 (slug: demo-hackathon-2026)`)

  // Create demo participants
  const participantNames = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Epsilon']
  const participants = []
  for (const name of participantNames) {
    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        kind: 'team',
        name,
        normalizedName: name.toLowerCase().replace(/\s+/g, '-'),
        accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      }
    })
    participants.push(participant)
  }
  console.log(`  ✓ Created ${participantNames.length} demo participants`)

  // Create demo judge
  const judgeCode = 'JUDGE001'
  const hashedJudgeCode = await bcrypt.hash(judgeCode, 10)
  await prisma.judge.create({
    data: {
      eventId: event.id,
      name: 'Demo Judge',
      email: 'judge@demo.com',
      code: judgeCode,
      hashedCode: hashedJudgeCode,
      role: 'judge',
      active: true,
    }
  })
  console.log(`  ✓ Created demo judge: judge@demo.com (code: ${judgeCode})`)

  // Create a second judge for panel testing
  const judgeCode2 = 'JUDGE002'
  const hashedJudgeCode2 = await bcrypt.hash(judgeCode2, 10)
  await prisma.judge.create({
    data: {
      eventId: event.id,
      name: 'Second Judge',
      email: 'judge2@demo.com',
      code: judgeCode2,
      hashedCode: hashedJudgeCode2,
      role: 'judge',
      active: true,
    }
  })
  console.log(`  ✓ Created second judge: judge2@demo.com (code: ${judgeCode2})`)

  // Create some sample scores for first participant
  const criteria = ['innovation', 'execution', 'presentation']
  for (const criterion of criteria) {
    await prisma.score.create({
      data: {
        eventId: event.id,
        participantId: participants[0].id,
        criterion,
        value: Math.floor(Math.random() * 30) + 70, // 70-100
        judgeUserId: 'demo-judge-1',
      }
    })
  }
  
  // Update participant total score
  const scores = await prisma.score.findMany({
    where: { participantId: participants[0].id }
  })
  const total = scores.reduce((sum, s) => sum + s.value, 0)
  await prisma.participant.update({
    where: { id: participants[0].id },
    data: { totalScore: total }
  })
  console.log(`  ✓ Created sample scores for ${participants[0].name}`)

  // Create registration token for testing
  await prisma.registrationToken.create({
    data: {
      token: 'DEMO-REG-TOKEN',
      eventId: event.id,
      createdById: adminUser.id,
      public: true,
      singleUse: false,
    }
  })
  console.log(`  ✓ Created registration token: DEMO-REG-TOKEN`)

  console.log('\n✅ Demo data seeded successfully!')
  console.log('\n' + '═'.repeat(50))
  console.log('📋 QUICK START GUIDE')
  console.log('═'.repeat(50))
  console.log('')
  console.log('  🔐 Admin Login:')
  console.log('     Email:    admin@demo.com')
  console.log('     Password: demo123456')
  console.log('')
  console.log('  📍 URLs:')
  console.log('     Dashboard: /dashboard')
  console.log('     Event:     /e/demo-hackathon-2026')
  console.log('     Admin:     /e/demo-hackathon-2026/admin')
  console.log('     Register:  /e/demo-hackathon-2026/register?token=DEMO-REG-TOKEN')
  console.log('')
  console.log('  👨‍⚖️ Judge Codes:')
  console.log('     Judge 1:   JUDGE001')
  console.log('     Judge 2:   JUDGE002')
  console.log('')
  console.log('═'.repeat(50))
  console.log('')
}

// Run the script
resetDatabase()
