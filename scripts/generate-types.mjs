import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { format } from 'prettier'

const types = execFileSync(
  'npx',
  ['supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'public'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
)
// Write only after generation and parsing succeed, preserving the previous file on failure.
writeFileSync(
  'src/lib/database.types.ts',
  await format(types, { parser: 'typescript', semi: false, singleQuote: true }),
)
console.log('Database types generated from the local migrations.')
