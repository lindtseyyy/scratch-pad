import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import { configurationError } from './lib/supabase'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './components/ui/Toast'
import { AppLayout } from './components/layout/AppLayout'
import { Button, InlineError, Spinner } from './components/ui/primitives'

const AuthPage = lazy(() =>
  import('./features/auth/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const LibraryPage = lazy(() =>
  import('./features/links/LibraryPage').then((module) => ({ default: module.LibraryPage })),
)
const TagsPage = lazy(() =>
  import('./features/tags/TagsPage').then((module) => ({ default: module.TagsPage })),
)
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
})
function RequireAuth() {
  const { session, loading, error } = useAuth()
  if (loading) return <Spinner label="Opening Scratch-Pad…" />
  if (error)
    return (
      <main className="page">
        <InlineError>{error}</InlineError>
        <Button className="mt-4" onClick={() => location.reload()}>
          Reload
        </Button>
      </main>
    )
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Scratch-Pad could not render', error, info.componentStack)
  }
  render() {
    return this.state.error ? (
      <main className="page">
        <h1 className="text-xl font-semibold">This page couldn’t open.</h1>
        <p className="mt-2 text-muted">Your saved links are still in your account.</p>
        <Button className="mt-5" onClick={() => location.reload()}>
          Reload the app
        </Button>
      </main>
    ) : (
      this.props.children
    )
  }
}
export default function App() {
  if (configurationError)
    return (
      <ThemeProvider>
        <main className="mx-auto max-w-lg px-6 py-20">
          <Bookmark className="mb-5 text-accent" aria-hidden="true" />
          <h1 className="text-2xl font-semibold">Connect your Scratch-Pad.</h1>
          <p className="mt-3 text-muted">{configurationError}</p>
          <p className="mt-5 leading-relaxed text-secondary">
            Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase public
            connection details and internal email domain, and restart the development server. For a
            local database, follow <code>README.md</code>.
          </p>
        </main>
      </ThemeProvider>
    )
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <Suspense fallback={<Spinner label="Opening page…" />}>
                  <Routes>
                    <Route path="/login" element={<AuthPage key="login" />} />
                    <Route path="/signup" element={<AuthPage signup key="signup" />} />
                    <Route element={<RequireAuth />}>
                      <Route element={<AppLayout />}>
                        <Route index element={<LibraryPage />} />
                        <Route path="tags" element={<TagsPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                      </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
