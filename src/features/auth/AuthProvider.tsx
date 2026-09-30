import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/errors'

const AuthContext = createContext<{
  session: Session | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
} | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  useEffect(() => {
    let active = true
    let previousId: string | undefined
    const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
      if (!active) return
      if (previousId !== next?.user.id) queryClient.clear()
      previousId = next?.user.id
      setError(null)
      setSession(next)
      setLoading(false)
    })
    getSupabase()
      .auth.getSession()
      .then(({ error: sessionError }) => {
        if (active && sessionError) {
          setError(errorMessage(sessionError))
          setLoading(false)
        }
      })
      .catch((error) => {
        if (active) {
          setError(errorMessage(error))
          setLoading(false)
        }
      })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])
  const signOut = async () => {
    const { error } = await getSupabase().auth.signOut()
    if (error) throw error
    queryClient.clear()
  }
  return (
    <AuthContext.Provider value={{ session, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
