import { execFileSync } from 'node:child_process'
import { defineConfig, devices } from '@playwright/test'

let local: { API_URL: string; ANON_KEY: string; PUBLISHABLE_KEY?: string }
try {
  local = JSON.parse(
    execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  )
} catch {
  throw new Error('Start local Supabase with npm run db:start before running browser tests.')
}
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'chrome',
  },
  projects: [
    { name: 'desktop', testIgnore: '**/pwa.spec.ts', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      testIgnore: '**/pwa.spec.ts',
      use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'small',
      testIgnore: '**/pwa.spec.ts',
      use: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'tablet',
      testIgnore: '**/pwa.spec.ts',
      use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'pwa',
      testMatch: '**/pwa.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5175' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: local.API_URL,
        VITE_SUPABASE_ANON_KEY: local.PUBLISHABLE_KEY || local.ANON_KEY,
        VITE_AUTH_EMAIL_DOMAIN: 'users.scratch-pad.test',
      },
    },
    {
      command: 'npm run build && npm run preview -- --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: local.API_URL,
        VITE_SUPABASE_ANON_KEY: local.PUBLISHABLE_KEY || local.ANON_KEY,
        VITE_AUTH_EMAIL_DOMAIN: 'users.scratch-pad.test',
      },
    },
  ],
})
