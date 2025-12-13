import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  try {
    console.log('Running migration...')
    
    const migrationSQL = readFileSync(
      join(__dirname, '../prisma/migrations/20251210_add_users_and_auth/migration.sql'),
      'utf-8'
    )

    // Execute the migration
    await db.$executeRawUnsafe(migrationSQL)
    
    console.log('✓ Migration completed successfully')
    console.log('\nDefault admin accounts created:')
    
    const users = await db.user.findMany({
      include: { organization: true }
    })
    
    users.forEach(user => {
      console.log(`  Email: ${user.email}`)
      console.log(`  Password: changeme123`)
      console.log(`  Organization: ${user.organization?.name || 'None'}`)
      console.log('  ---')
    })
    
    console.log('\n⚠️  Please change these default passwords after first login!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

runMigration()
