import { defineConfig } from '@playwright/test'
import appConfig from './playwright.config'

export default defineConfig({
  testDir: './tests/extension',
  outputDir: './test-results/extension',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://127.0.0.1:5174' },
  // Only the development server is needed; keep the hosted build untouched.
  webServer: Array.isArray(appConfig.webServer) ? appConfig.webServer[0] : appConfig.webServer,
})
