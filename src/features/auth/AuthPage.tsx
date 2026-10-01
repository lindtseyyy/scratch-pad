import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { authEmailDomain, getSupabase } from '../../lib/supabase'
import { isValidUsername, usernameToEmail } from '../../lib/auth-email'
import { isStrongPassword } from '../../lib/password-rules'
import { errorMessage } from '../../lib/errors'
import { authDestination } from '../../lib/auth-redirect'
import { Button, Field, InlineError, Input, Spinner } from '../../components/ui/primitives'
import { PasswordRules } from './PasswordRules'
import { AppFooter } from '../../components/layout/AppFooter'

export function AuthPage({ signup = false }: { signup?: boolean }) {
  const { session, loading, error: authError } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (loading) return <Spinner />
  if (session) return <Navigate to={authDestination(location.state)} replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const email = usernameToEmail(username, authEmailDomain)
      if (signup) {
        if (!isStrongPassword(password) || confirmation !== password)
          throw new Error('Check the password requirements and confirmation.')
        const { data, error } = await getSupabase().auth.signUp({
          email,
          password,
          options: { data: { username } },
        })
        if (error) throw error
        if (!data.session)
          throw new Error(
            'Signup could not start a session. The project must disable email confirmation for username accounts; an existing username may also cause this response.',
          )
      } else {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] py-8 sm:py-12">
        <Link
          to="/"
          className="mb-6 flex items-center gap-2.5 text-lg font-semibold tracking-tight touch:min-h-11 sm:mb-10"
        >
          <Bookmark size={21} className="text-accent" aria-hidden="true" />
          Scratch-Pad
        </Link>
        <div className="rounded-lg border border-line bg-surface p-5 sm:p-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
            A place for your links
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {signup ? 'Make room for later.' : 'Welcome back.'}
          </h1>
          <p className={`mb-8 mt-2 text-sm text-muted ${signup ? '' : 'italic'}`}>
            {signup
              ? 'Save what catches your eye. Find it when you need it.'
              : 'Your saved links, right where you left them.'}
          </p>
          <form onSubmit={submit} className="space-y-5">
            {(error || authError) && <InlineError>{error || authError}</InlineError>}
            <Field
              id="username"
              label="Username"
              hint={signup ? '3–30 lowercase letters, numbers, or underscores.' : undefined}
            >
              <Input
                id="username"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9_]{3,30}"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby={signup ? 'username-hint' : undefined}
              />
            </Field>
            <Field id="password" label="Password">
              <Input
                id="password"
                type="password"
                autoComplete={signup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {signup && (
              <>
                <PasswordRules password={password} />
                <Field id="confirmation" label="Confirm password">
                  <Input
                    id="confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    required
                    aria-invalid={!!confirmation && confirmation !== password}
                  />
                </Field>
                {confirmation && confirmation !== password && (
                  <p className="text-xs text-danger">Passwords don’t match yet.</p>
                )}
              </>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                busy ||
                !isValidUsername(username) ||
                !password ||
                (signup && (!isStrongPassword(password) || password !== confirmation))
              }
            >
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            {signup ? 'Already have an account? ' : 'New here? '}
            <Link
              className="font-medium text-accent hover:underline"
              to={signup ? '/login' : '/signup'}
              state={location.state}
              replace
            >
              {signup ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
