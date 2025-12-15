import { execSync } from 'child_process';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/^\s*DATABASE_URL\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\r\n]*))/m);
const dbUrl = m && (m[1]||m[2]||m[3]);
if (!dbUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}
console.log('Using DATABASE_URL from .env');
try {
  execSync(`npx prisma db execute --url "${dbUrl}" --file prisma/sql/create_idempotency_key.sql`, { stdio: 'inherit' });
} catch (e) {
  console.error('prisma db execute failed', e.message);
  process.exit(1);
}
try {
  execSync('node tests/performance-profile.mjs', { stdio: 'inherit' });
} catch (e) {
  console.error('perf script failed', e.message);
  process.exit(1);
}
