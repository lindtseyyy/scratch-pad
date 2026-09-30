import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { usernameToEmail } from './auth-email'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
export const authEmailDomain = import.meta.env.VITE_AUTH_EMAIL_DOMAIN?.trim() || ''

export const configurationError = (() => {
  if (
    !url ||
    !key ||
    !authEmailDomain ||
    url.includes('your-project') ||
    key.startsWith('your-public')
  )
    return 'The Supabase connection has not been configured.'
  try {
    const parsed = new URL(url)
    if (
      parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
    )
      return 'Use HTTPS for a hosted Supabase connection.'
    usernameToEmail('config_check', authEmailDomain)
    if (key.startsWith('sb_secret_'))
      return 'Use a public publishable or anon key. Secret keys cannot be used in the browser.'
    if (key.startsWith('eyJ') && JSON.parse(atob(key.split('.')[1])).role !== 'anon')
      return 'Use the public anon key, never a privileged key.'
  } catch {
    return 'Check the Supabase URL, public key, and internal email domain.'
  }
  return null
})()

const client = configurationError ? null : createClient<Database>(url, key)
export function getSupabase() {
  if (!client) throw new Error(configurationError || 'Supabase is unavailable.')
  return client
}
