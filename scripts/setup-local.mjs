import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'

if (existsSync('.env.local')) {
  console.error(
    '.env.local already exists. Keep it for the hosted project, or move it aside before setting up locally.',
  )
  process.exit(1)
}
execFileSync('npx', ['supabase', 'start'], { stdio: 'inherit' })
const status = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
writeFileSync(
  '.env.local',
  `VITE_SUPABASE_URL=${status.API_URL}\nVITE_SUPABASE_ANON_KEY=${status.PUBLISHABLE_KEY || status.ANON_KEY}\nVITE_AUTH_EMAIL_DOMAIN=users.scratch-pad.test\n`,
  { mode: 0o600 },
)
console.log('Local Supabase configured. Run npm run db:test, then npm run dev.')
