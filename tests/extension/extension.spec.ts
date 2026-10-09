import { execFileSync } from 'node:child_process'
import { appendFile, cp, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  chromium,
  test as base,
  expect,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test'

const local = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
const password = 'TestPassword12!'
const test = base.extend<{
  extensionContext: BrowserContext
  worker: Worker
  account: string
}>({
  extensionContext: async ({ baseURL }, runFixture, testInfo) => {
    const extensionPath = testInfo.outputPath('unpacked-extension')
    await cp(resolve('extension'), extensionPath, { recursive: true })
    const urlPath = resolve(extensionPath, 'share-url.js')
    await writeFile(
      urlPath,
      (await readFile(urlPath, 'utf8')).replace(
        /^export const APP_URL = .+$/m,
        `export const APP_URL = ${JSON.stringify(baseURL)}`,
      ),
    )
    // Invoke the registered handlers in their real background worker. Browser
    // chrome gestures are a manual check; windows, navigation and closing are real.
    // This bridge exists only in the disposable test copy of the extension.
    await appendFile(
      resolve(extensionPath, 'background.js'),
      '\nglobalThis.__scratchPadTest = { savePage, handleContextMenu };\n',
    )
    const context = await chromium.launchPersistentContext(testInfo.outputPath('profile'), {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    })
    try {
      await runFixture(context)
    } finally {
      await context.close()
    }
  },
  worker: async ({ extensionContext }, runFixture) => {
    const worker =
      extensionContext.serviceWorkers()[0] || (await extensionContext.waitForEvent('serviceworker'))
    await expect.poll(() => worker.evaluate('typeof globalThis.__scratchPadTest')).toBe('object')
    await runFixture(worker)
  },
  account: async ({ worker }, runFixture) => {
    // Ensure the extension has loaded before creating a disposable account.
    expect(worker.url()).toMatch(/^chrome-extension:\/\//)
    const username = `ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
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
      await runFixture(username)
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

async function invoke(
  context: BrowserContext,
  worker: Worker,
  handler: 'savePage' | 'handleContextMenu',
  ...args: unknown[]
) {
  const created = context.waitForEvent('page')
  await worker.evaluate(`globalThis.__scratchPadTest.${handler}(...${JSON.stringify(args)})`)
  return created
}

test('loaded extension saves through login, reuses the session, edits duplicates and opens the library', async ({
  extensionContext,
  worker,
  account,
}) => {
  const manifest = await worker.evaluate<{
    permissions: string[]
    host_permissions?: string[]
    commands: { _execute_action: { suggested_key: { default: string } } }
  }>('chrome.runtime.getManifest()')
  expect(manifest.permissions).toEqual(['contextMenus', 'activeTab'])
  expect(manifest.host_permissions).toBeUndefined()
  expect(manifest.commands._execute_action.suggested_key.default).toBe('Alt+Shift+S')
  expect(
    await worker.evaluate(`({
      action: chrome.action.onClicked.hasListener(__scratchPadTest.savePage),
      menu: chrome.contextMenus.onClicked.hasListener(__scratchPadTest.handleContextMenu),
    })`),
  ).toEqual({ action: true, menu: true })

  const page = await invoke(extensionContext, worker, 'savePage', {
    url: 'https://example.com/article?a=1&b=2#heading',
    title: 'Article & notes',
  })
  await login(page, account)
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue(
    'https://example.com/article?a=1&b=2#heading',
  )
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Article & notes')
  expect(await page.evaluate(() => history.length)).toBe(1)
  const closed = page.waitForEvent('close')
  await page.getByRole('button', { name: 'Save link', exact: true }).click()
  await closed

  const duplicate = await invoke(
    extensionContext,
    worker,
    'handleContextMenu',
    { menuItemId: 'page' },
    { url: 'https://example.com/article?a=1&b=2#heading', title: 'Article & notes' },
  )
  await duplicate.getByRole('button', { name: 'Edit the saved link' }).click()
  await expect(duplicate.getByRole('heading', { name: 'Edit link', exact: true })).toBeVisible()
  await duplicate.getByLabel('Title', { exact: true }).fill('Updated from the extension')
  const duplicateClosed = duplicate.waitForEvent('close')
  await duplicate.getByRole('button', { name: 'Save changes', exact: true }).click()
  await duplicateClosed

  const library = await invoke(extensionContext, worker, 'handleContextMenu', {
    menuItemId: 'library',
  })
  await expect(library.getByRole('article')).toContainText('Updated from the extension')
  expect(library.isClosed()).toBe(false)
})

test('loaded extension opens clicked links, selections and empty add windows, and cancel closes them', async ({
  extensionContext,
  worker,
  account,
  baseURL,
}) => {
  const library = await extensionContext.newPage()
  await library.goto(`${baseURL}/login`)
  await login(library, account)
  await expect(library.getByRole('heading', { name: 'Library', exact: true })).toBeVisible()

  const link = await invoke(
    extensionContext,
    worker,
    'handleContextMenu',
    { menuItemId: 'link', linkUrl: 'https://example.com/link', linkText: 'The link title' },
    { url: 'https://example.com/page', title: 'The containing page' },
  )
  await expect(link.getByLabel('URL', { exact: true })).toHaveValue('https://example.com/link')
  await expect(link.getByLabel('Title', { exact: true })).toHaveValue('The link title')
  const linkClosed = link.waitForEvent('close')
  await link.getByRole('button', { name: 'Cancel', exact: true }).click()
  await linkClosed

  const selection = await invoke(extensionContext, worker, 'handleContextMenu', {
    menuItemId: 'selection',
    selectionText: 'check this https://example.com/selected.',
  })
  await expect(selection.getByLabel('URL', { exact: true })).toHaveValue(
    'https://example.com/selected',
  )
  const selectionClosed = selection.waitForEvent('close')
  await selection.getByLabel('Title', { exact: true }).press('Escape')
  await selectionClosed

  const empty = await invoke(extensionContext, worker, 'savePage', { url: 'chrome://extensions' })
  await expect(empty.getByLabel('URL', { exact: true })).toHaveValue('')
  const emptyClosed = empty.waitForEvent('close')
  await empty.getByRole('button', { name: 'Cancel', exact: true }).click()
  await emptyClosed
  expect(library.isClosed()).toBe(false)
})
