import { execFileSync } from 'node:child_process'
import { test as base, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import AxeBuilder from '@axe-core/playwright'

const local = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
const password = 'TestPassword12!'
const test = base.extend<{ account: string }>({
  account: async ({ browserName }, runTest) => {
    const username = `pwa_${browserName}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 4)}`
    const api = createClient(local.API_URL, local.PUBLISHABLE_KEY || local.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    try {
      const { error } = await api.auth.signUp({
        email: `${username}@users.scratch-pad.test`,
        password,
        options: { data: { username } },
      })
      expect(error).toBeNull()
      await runTest(username)
    } finally {
      execFileSync(
        'psql',
        [
          local.DB_URL,
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          `delete from auth.users where raw_user_meta_data->>'username' = '${username}';`,
        ],
        { stdio: 'ignore' },
      )
    }
  },
})

async function login(page: Page, username: string) {
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
}
async function controlled(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
}
async function accessible(page: Page) {
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([])
}

type PopupWindow = typeof window & {
  closeCalls: { notice: string; delay: number | null }[]
}

async function stubWindowClose(page: Page) {
  await page.addInitScript(() => {
    const popup = window as PopupWindow
    popup.closeCalls = []
    let savedAt: number | null = null
    new MutationObserver(() => {
      const notice =
        document.querySelector('[role="status"][aria-live="polite"]')?.textContent || ''
      if (/Link saved for later\.|Link updated\./.test(notice) && savedAt === null)
        savedAt = performance.now()
    }).observe(document, { subtree: true, childList: true, characterData: true })
    window.close = () => {
      popup.closeCalls.push({
        notice: document.querySelector('[role="status"][aria-live="polite"]')?.textContent || '',
        delay: savedAt === null ? null : performance.now() - savedAt,
      })
    }
  })
}

async function closeCalls(page: Page) {
  return page.evaluate(() => (window as PopupWindow).closeCalls)
}

async function expectSavedPopupClose(page: Page, notice = 'Link saved for later.') {
  await expect(page.getByRole('status').filter({ hasText: notice })).toBeVisible()
  await expect.poll(async () => (await closeCalls(page)).length).toBe(1)
  const [call] = await closeCalls(page)
  expect(call.notice).toContain(notice)
  // Leave the success notice visible for roughly 600ms before closing.
  expect(call.delay).toBeGreaterThanOrEqual(550)
}

test('a popup share closes after saving through login', async ({ page, account }) => {
  await stubWindowClose(page)
  await page.goto('/share?url=https://example.com/popup&title=Popup%20share&popup=1')
  await page.getByRole('link', { name: 'Create an account' }).click()
  await page.getByRole('link', { name: 'Log in', exact: true }).click()
  await login(page, account)
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue('https://example.com/popup')
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Popup share')
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expectSavedPopupClose(page)
})

test('a fresh share window can close itself after login and saving', async ({
  page,
  account,
  baseURL,
}) => {
  // Replace Playwright's initial blank page, matching a window created at the share URL.
  await page.evaluate(
    (url) => window.location.replace(url),
    new URL('/share?url=https://example.com/real-close&popup=1', baseURL).href,
  )
  await login(page, account)
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue(
    'https://example.com/real-close',
  )
  expect(await page.evaluate(() => window.history.length)).toBe(1)
  const closed = page.waitForEvent('close', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await closed
})

test('popup Cancel and Escape close immediately', async ({ page, account }) => {
  await stubWindowClose(page)
  await page.goto('/login')
  await login(page, account)
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible()
  for (const cancel of ['button', 'escape']) {
    await page.goto('/share?url=https://example.com/cancel&popup=1')
    await expect(page.getByRole('dialog')).toBeVisible()
    if (cancel === 'button') {
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    } else {
      await page.getByLabel('Title', { exact: true }).press('Escape')
    }
    expect(await closeCalls(page)).toEqual([{ notice: '', delay: null }])
  }
})

test('an empty popup add preserves filters and closes after a save or cancel', async ({
  page,
  account,
}) => {
  await stubWindowClose(page)
  await page.goto('/?add=1&popup=1&q=kept')
  await login(page, account)
  await expect(page).toHaveURL(/\?q=kept$/)
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue('')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await closeCalls(page)).toEqual([{ notice: '', delay: null }])
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/?add=1&popup=1')
  await page.getByLabel('URL', { exact: true }).fill('https://example.com/empty-popup')
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expectSavedPopupClose(page)
})

test('editing a duplicate shared into a popup keeps the close flag', async ({ page, account }) => {
  await stubWindowClose(page)
  await page.goto('/share?url=https://example.com/duplicate&title=Original')
  await login(page, account)
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Original')
  await page.goto('/share?url=https://example.com/duplicate&popup=1')
  await page.getByRole('button', { name: 'Edit the saved link' }).click()
  await expect(page.getByRole('heading', { name: 'Edit link', exact: true })).toBeVisible()
  await page.getByLabel('Title', { exact: true }).fill('Updated in popup')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expectSavedPopupClose(page, 'Link updated.')
  await expect(page.getByRole('article')).toContainText('Updated in popup')
})

test('ordinary shares and add dialogs never close the window', async ({ page, account }) => {
  await stubWindowClose(page)
  await page.goto('/share?url=https://example.com/ordinary&title=Ordinary')
  await login(page, account)
  await page.clock.install()
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Ordinary')
  // Advance past the popup delay to detect a stray scheduled close.
  await page.clock.runFor(1000)
  expect(await closeCalls(page)).toEqual([])
  await page.goto('/share?url=https://example.com/cancel&popup=0')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await closeCalls(page)).toEqual([])
  await page.goto('/?add=1')
  await page.getByLabel('URL', { exact: true }).press('Escape')
  expect(await closeCalls(page)).toEqual([])
})

test('failed popup saves keep the draft open', async ({ page, account }) => {
  await stubWindowClose(page)
  await page.goto('/share?url=https://example.com/retry&popup=1')
  await login(page, account)
  await page.route('**/rest/v1/rpc/save_link', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"message":"Try again"}',
    }),
  )
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue('https://example.com/retry')
  expect(await closeCalls(page)).toEqual([])
  await page.unroute('**/rest/v1/rpc/save_link')
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expectSavedPopupClose(page)
})

test('production manifest, icons and service worker', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  )
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('application/manifest+json')
  const manifest = await response.json()
  expect(manifest).toMatchObject({
    name: 'Scratch-Pad',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    share_target: {
      action: '/share',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
    shortcuts: [{ name: 'Add a link', url: '/?add=1' }],
  })
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  )
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    const bytes = await response.body()
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes)
  }
  await controlled(page)
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.context().setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
})

test('shares survive login, support duplicates and are consumed once', async ({
  page,
  account,
}) => {
  await page.goto('/login')
  await page.goto('/share?text=Watch%20this%20https://youtu.be/abc123&title=Video')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL(/\/signup$/)
  await page.getByRole('link', { name: 'Log in', exact: true }).click()
  await login(page, account)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue('https://youtu.be/abc123')
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Video')
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Video')
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: 'Tags', exact: true }).click()
  await page.goto('/share?url=https://youtu.be/abc123&title=Shared%20again')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Shared again')
  await expect(page.getByText(/You saved this on/)).toBeVisible()
  await page.getByRole('button', { name: 'Edit the saved link' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit link' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.goBack()
  await expect(page).toHaveURL(/\/tags$/)
  await page.goForward()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/share?url=https://example.com/second&title=Second')
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue('https://example.com/second')
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Second')
})

test('a share survives account creation', async ({ page }) => {
  const username = `pwa_new_${Date.now().toString(36)}`
  try {
    await stubWindowClose(page)
    await page.goto('/share?url=https://example.com/new&title=First%20share&popup=1')
    await page.getByRole('link', { name: 'Create an account' }).click()
    await page.getByLabel('Username', { exact: true }).fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.getByLabel('URL', { exact: true })).toHaveValue('https://example.com/new')
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('First share')
    await page.getByRole('button', { name: 'Save link', exact: true }).click()
    await expectSavedPopupClose(page)
  } finally {
    execFileSync(
      'psql',
      [
        local.DB_URL,
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        `delete from auth.users where raw_user_meta_data->>'username' = '${username}';`,
      ],
      { stdio: 'ignore' },
    )
  }
})

test('a missing link shows a notice and the install shortcut opens only once', async ({
  page,
  account,
}) => {
  await page.goto('/share?text=hello')
  await login(page, account)
  await expect(
    page.getByRole('status').filter({ hasText: "That share didn't include a web link." }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/?add=1&q=kept')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(/\?q=kept$/)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Search links')).toHaveValue('kept')
})

test('offline deep links and drafts work, and reconnecting restores saving', async ({
  page,
  context,
  account,
}) => {
  await page.goto('/login')
  await login(page, account)
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible()
  await controlled(page)
  const network = await context.newCDPSession(page)
  const navigatorOffline = (offline: boolean) =>
    network.send('Network.overrideNetworkState', {
      offline,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
  await context.setOffline(true)
  const offlinePage = await page.goto('/tags')
  expect(offlinePage?.fromServiceWorker()).toBe(true)
  // Chrome's network emulation resets navigator.onLine after SW navigation.
  // Reapply the native navigator override while requests remain blocked by setOffline.
  await navigatorOffline(true)
  expect(await page.evaluate(() => navigator.onLine)).toBe(false)
  await expect(page.getByRole('heading', { name: 'Tags', exact: true })).toBeVisible()
  await expect(
    page.getByText("You're offline. Saved links will load when you reconnect."),
  ).toBeVisible()
  await accessible(page)
  await page.goto('/share?url=https://example.com/offline&title=Offline%20draft')
  await navigatorOffline(true)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Offline draft')
  await page.getByLabel('Note (optional)').fill('Keep this input')
  await expect(page.getByRole('button', { name: 'Save link', exact: true })).toBeDisabled()
  await expect(page.getByText('Reconnect to save.')).toBeVisible()
  await page.getByLabel('Title', { exact: true }).press('Control+Enter')
  await expect(page.getByLabel('Note (optional)')).toHaveValue('Keep this input')
  await accessible(page)
  await context.setOffline(false)
  await navigatorOffline(false)
  await expect(page.getByText('Reconnect to save.')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save link', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Offline draft')
  const cachedUrls = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((request) => request.url),
        ),
      )
    ).flat(),
  )
  expect(cachedUrls.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
  expect(cachedUrls.some((url) => /\/(auth|rest)\/v1\//.test(url))).toBe(false)
})

test('offline login reports the connection problem', async ({ page, context, account }) => {
  await page.goto('/login')
  await controlled(page)
  await context.setOffline(true)
  await login(page, account)
  await expect(page.getByRole('alert')).toHaveText("You're offline. Connect and try again.")
})
