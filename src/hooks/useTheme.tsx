import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
export type Theme = 'system' | 'light' | 'dark'
const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  cycle: () => void
} | null>(null)
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('scratch-pad-theme')
      return stored === 'light' || stored === 'dark' ? stored : 'system'
    } catch {
      return 'system'
    }
  })
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#181b18' : '#f8f8f7')
    }
    apply()
    try {
      localStorage.setItem('scratch-pad-theme', theme)
    } catch {
      /* The theme still works without storage. */
    }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        cycle: () => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'),
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('ThemeProvider is required')
  return value
}
