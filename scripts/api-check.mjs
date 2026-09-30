import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const linked = process.argv.includes('--linked')
const env = linked ? loadEnv('development', process.cwd(), 'VITE_') : null
if (linked) {
  const ref = readFileSync('supabase/.temp/project-ref', 'utf8').trim()
  if (env.VITE_SUPABASE_URL !== `https://${ref}.supabase.co`)
    throw new Error('The linked project and .env.local URL do not match.')
}
const status = linked
  ? { API_URL: env.VITE_SUPABASE_URL, PUBLISHABLE_KEY: env.VITE_SUPABASE_ANON_KEY }
  : JSON.parse(
      execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    )
const client = () =>
  createClient(status.API_URL, status.PUBLISHABLE_KEY || status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
const prefix = `api_${Date.now().toString(36)}`
const domain = linked ? env.VITE_AUTH_EMAIL_DOMAIN : 'users.scratch-pad.test'
const password = `Test_${randomUUID()}A1!`
const alice = client(),
  bob = client(),
  anon = client()
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}
try {
  const weak = await anon.auth.signUp({
    email: `${prefix}_weak@${domain}`,
    password: 'weak',
    options: { data: { username: `${prefix}_weak` } },
  })
  assert.ok(weak.error, 'Server must reject weak passwords')
  const missingClasses = await anon.auth.signUp({
    email: `${prefix}_classes@${domain}`,
    password: 'lowercaseonlylong',
    options: { data: { username: `${prefix}_classes` } },
  })
  assert.ok(missingClasses.error, 'Server must require uppercase, digits, and symbols')
  for (const [suffix, api] of [
    ['alice', alice],
    ['bob', bob],
  ]) {
    const auth = unwrap(
      await api.auth.signUp({
        email: `${prefix}_${suffix}@${domain}`,
        password,
        options: { data: { username: `${prefix}_${suffix}` } },
      }),
    )
    assert.ok(auth.session, 'Email confirmations must be disabled')
    assert.equal(
      unwrap(await api.from('profiles').select('username').single()).username,
      `${prefix}_${suffix}`,
    )
  }
  const [saved] = unwrap(
    await alice.rpc('save_link', {
      p_url: 'https://example.com/saved',
      p_title: '100%_literal',
      p_source: 'Example',
      p_tag_names: [' React ', 'react', 'video'],
    }),
  )
  const [embedded] = unwrap(await alice.rpc('search_links').select('*, tags(id, name)'))
  assert.equal(embedded.id, saved.id)
  assert.deepEqual(embedded.tags.map((t) => t.name).sort(), ['react', 'video'])
  const ids = embedded.tags.map((t) => t.id)
  assert.equal(unwrap(await alice.rpc('search_links', { p_tag_ids: ids })).length, 1)
  assert.equal(unwrap(await alice.rpc('search_links', { p_query: '%_' })).length, 1)
  assert.equal(unwrap(await alice.rpc('search_links', { p_query: 'anything%_' })).length, 0)
  assert.equal(unwrap(await alice.rpc('search_links', { p_source: 'Other' })).length, 0)
  const [other] = unwrap(
    await alice.rpc('save_link', {
      p_url: 'https://example.com/other',
      p_title: 'Other',
      p_tag_names: ['react'],
    }),
  )
  assert.equal(
    unwrap(await alice.rpc('search_links', { p_tag_ids: ids })).length,
    1,
    'Must match every tag',
  )
  assert.equal(
    unwrap(await alice.rpc('search_links', { p_tag_ids: [ids[0], ids[0]] })).length,
    ids[0] === embedded.tags.find((t) => t.name === 'react').id ? 2 : 1,
  )
  const before = saved.created_at
  const [edited] = unwrap(
    await alice.rpc('save_link', {
      p_id: saved.id,
      p_url: saved.url,
      p_title: 'Edited',
      p_source: saved.source,
      p_tag_names: ['react', 'video'],
    }),
  )
  assert.equal(edited.created_at, before)
  assert.ok(edited.updated_at >= saved.updated_at)
  const invalid = await alice.rpc('save_link', {
    p_id: saved.id,
    p_url: saved.url,
    p_title: 'Must roll back',
    p_tag_names: ['x'.repeat(33)],
  })
  assert.ok(invalid.error)
  assert.equal(
    unwrap(await alice.from('links').select('title').eq('id', saved.id).single()).title,
    'Edited',
  )
  assert.equal(unwrap(await bob.from('links').select('id').eq('id', saved.id)).length, 0)
  assert.equal(
    unwrap(await bob.from('links').update({ title: 'stolen' }).eq('id', saved.id).select()).length,
    0,
  )
  assert.equal(unwrap(await bob.from('links').delete().eq('id', saved.id).select()).length, 0)
  assert.ok(
    (await bob.rpc('save_link', { p_id: saved.id, p_url: saved.url, p_title: 'stolen' })).error,
  )
  const [bobLink] = unwrap(
    await bob.rpc('save_link', { p_url: 'https://example.com/bob', p_title: 'Bob' }),
  )
  assert.equal(
    (await bob.from('link_tags').insert({ link_id: bobLink.id, tag_id: ids[0] })).error?.code,
    '23503',
  )
  assert.ok((await anon.from('links').select()).error)
  assert.ok((await anon.rpc('search_links')).error)
  const video = embedded.tags.find((t) => t.name === 'video')
  unwrap(await alice.from('tags').update({ name: 'watch' }).eq('id', video.id))
  assert.equal(
    unwrap(await alice.from('tag_usage').select('link_count').eq('id', video.id).single())
      .link_count,
    1,
  )
  unwrap(await alice.from('tags').delete().eq('id', video.id))
  assert.equal(unwrap(await alice.from('links').select('id').eq('id', saved.id)).length, 1)
  assert.equal(
    unwrap(await alice.rpc('search_links').select('*, tags(id, name)')).find(
      (l) => l.id === saved.id,
    ).tags.length,
    1,
  )
  unwrap(
    await alice.from('links').insert(
      Array.from({ length: 51 }, (_, i) => ({
        url: `https://example.com/page-${i}`,
        title: `Page ${i.toString().padStart(2, '0')}`,
        source: 'Pagination',
      })),
    ),
  )
  assert.equal(
    unwrap(await alice.rpc('search_links', { p_source: 'Pagination', p_limit: 50 })).length,
    50,
  )
  assert.equal(
    unwrap(await alice.rpc('search_links', { p_source: 'Pagination', p_offset: 50 })).length,
    1,
  )
  assert.equal(
    unwrap(await alice.rpc('search_links', { p_source: 'Pagination', p_sort: 'title' }))[0].title,
    'Page 00',
  )
  assert.equal(unwrap(await alice.rpc('link_sources')).length, 2)
  unwrap(await alice.from('links').delete().eq('id', other.id))
  console.log(
    'PASS: real Auth policy, profile trigger, REST/RPC isolation, embedded tags, rollback, AND/literal search, CRUD, counts and pagination',
  )
} finally {
  // Only the ephemeral test prefix is removed; credentials stay in the CLI keyring.
  const cleanup = `delete from auth.users where raw_user_meta_data->>'username' like '${prefix.replaceAll('_', '\\_')}%';`
  if (linked)
    execFileSync('npx', ['supabase', 'db', 'query', '--linked', cleanup], { stdio: 'ignore' })
  else
    execFileSync('psql', [status.DB_URL, '-v', 'ON_ERROR_STOP=1', '-c', cleanup], {
      stdio: 'ignore',
    })
}
