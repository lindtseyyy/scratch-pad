import { execFileSync } from 'node:child_process'

const status = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
execFileSync(
  'psql',
  [status.DB_URL, '-v', 'ON_ERROR_STOP=1', '-f', 'supabase/tests/rls_check.sql'],
  { stdio: 'inherit' },
)
execFileSync('node', ['scripts/api-check.mjs'], { stdio: 'inherit' })
