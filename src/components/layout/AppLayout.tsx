import { NavLink, Outlet } from 'react-router-dom'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Bookmark, ChevronDown, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../features/auth/AuthProvider'
import { useTheme } from '../../hooks/useTheme'
import { errorMessage } from '../../lib/errors'
import { Button, InlineError } from '../ui/primitives'

export function AppLayout() {
  const { session, signOut } = useAuth()
  const { theme, cycle } = useTheme()
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon
  const username =
    typeof session?.user.user_metadata.username === 'string'
      ? session.user.user_metadata.username
      : 'Account'
  return (
    <>
      <a
        href="#main"
        className="sr-only fixed left-4 top-4 z-50 rounded bg-surface px-4 py-2 focus:not-sr-only"
      >
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[908px] flex-wrap items-center justify-between gap-x-4 gap-y-1 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-3 sm:gap-y-3 sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:py-4 lg:max-w-[1168px]">
          <NavLink
            to="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight touch:min-h-11"
          >
            <Bookmark size={18} className="text-accent" aria-hidden="true" />
            Scratch-Pad
          </NavLink>
          <div className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-0">
            <Button
              type="button"
              variant="ghost"
              className="px-2 touch:min-h-11 touch:min-w-11"
              onClick={cycle}
              aria-label={`Theme: ${theme}. Cycle theme.`}
              title={`Theme: ${theme}`}
            >
              <Icon size={17} aria-hidden="true" />
            </Button>
            <Menu>
              <MenuButton
                className="flex min-h-10 items-center gap-1.5 rounded px-2 text-sm text-secondary hover:bg-soft touch:min-h-11 touch:min-w-11"
                aria-label="Account menu"
              >
                <span className="hidden max-w-24 truncate sm:inline">{username}</span>
                <UserRound size={17} className="sm:hidden" aria-hidden="true" />
                <ChevronDown size={13} aria-hidden="true" />
              </MenuButton>
              <MenuItems
                anchor="bottom end"
                className="z-30 min-w-40 rounded-md border border-line bg-surface p-1 [--anchor-gap:6px]"
              >
                <MenuItem>
                  <button
                    disabled={signingOut}
                    className="menu-item"
                    onClick={async () => {
                      setSigningOut(true)
                      try {
                        await signOut()
                      } catch (error) {
                        setError(errorMessage(error))
                        setSigningOut(false)
                      }
                    }}
                  >
                    <LogOut size={14} aria-hidden="true" />
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
          <nav
            aria-label="Main navigation"
            className="order-3 flex w-full gap-5 text-sm sm:order-2 sm:ml-auto sm:w-auto sm:gap-4"
          >
            {[
              ['/', 'Library'],
              ['/tags', 'Tags'],
              ['/settings', 'Settings'],
            ].map(([path, label]) => (
              <NavLink
                end
                key={path}
                to={path}
                className={({ isActive }) =>
                  `inline-flex items-center rounded py-1 font-medium touch:min-h-11 touch:min-w-11 ${isActive ? 'text-accent underline decoration-accent/40 underline-offset-8' : 'text-muted hover:text-ink'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      {error && (
        <div className="mx-auto mt-3 max-w-[860px] px-5">
          <InlineError>{error}</InlineError>
        </div>
      )}
      <Outlet />
      <footer className="mx-auto max-w-[908px] px-5 pb-6 text-xs text-muted sm:px-6">
        Saved for a quieter moment.
      </footer>
    </>
  )
}
