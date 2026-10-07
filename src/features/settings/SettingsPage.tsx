import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { getSupabase } from '../../lib/supabase'
import { isStrongPassword } from '../../lib/password-rules'
import { errorMessage } from '../../lib/errors'
import { Button, Field, InlineError, Input } from '../../components/ui/primitives'
import { PasswordRules } from '../auth/PasswordRules'
import { useToast } from '../../components/ui/Toast'

export function SettingsPage() {
  const { session } = useAuth()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const profile = useQuery({
    queryKey: ['profile', session?.user.id],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('username')
        .eq('id', session!.user.id)
        .abortSignal(signal)
        .single()
      if (error) throw error
      return data
    },
  })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (!session?.user.email) throw new Error('Your account email is unavailable. Log in again.')
      if (!isStrongPassword(password) || password !== confirmation)
        throw new Error('Check the password requirements and confirmation.')
      // A fresh password login proves account ownership and satisfies secure password change.
      const reauth = await getSupabase().auth.signInWithPassword({
        email: session.user.email,
        password: current,
      })
      if (reauth.error)
        throw new Error('The current password is incorrect, or sign-in is temporarily unavailable.')
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) throw error
      setCurrent('')
      setPassword('')
      setConfirmation('')
      toast('Password changed.')
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main id="main" className="page">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="mt-7 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs dark:shadow-none">
        <section aria-labelledby="account-heading" className="p-4 sm:p-6">
          <h2 id="account-heading" className="text-base font-medium">
            Account
          </h2>
          <div className="mt-4">
            <p className="text-xs text-muted">Username</p>
            <p className="mt-1 font-medium">
              {profile.data?.username || (profile.isPending ? 'Loading…' : 'Unavailable')}
            </p>
            {profile.isError && (
              <p role="alert" className="mt-2 text-xs text-danger">
                Your profile couldn’t load.{' '}
                <button className="tap underline" onClick={() => void profile.refetch()}>
                  Retry
                </button>
              </p>
            )}
          </div>
        </section>
        <section aria-labelledby="password-heading" className="p-4 sm:p-6">
          <h2 id="password-heading" className="text-base font-medium">
            Change password
          </h2>
          <form onSubmit={submit} className="mt-4 max-w-md space-y-4">
            {error && <InlineError>{error}</InlineError>}
            <fieldset disabled={busy} className="space-y-4">
              <Field id="current-password" label="Current password">
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              </Field>
              <Field id="new-password" label="New password">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <PasswordRules password={password} />
              <Field id="confirm-new-password" label="Confirm new password">
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  required
                  aria-invalid={!!confirmation && password !== confirmation}
                />
              </Field>
              {confirmation && password !== confirmation && (
                <p className="text-xs text-danger">Passwords don’t match yet.</p>
              )}
            </fieldset>
            <Button
              type="submit"
              disabled={
                busy || !current || !isStrongPassword(password) || password !== confirmation
              }
            >
              {busy ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </section>
      </div>
    </main>
  )
}
