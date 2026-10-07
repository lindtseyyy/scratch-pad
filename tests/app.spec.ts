import { execFileSync } from 'node:child_process'
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'

const local = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
test('account, library, tags, filters, themes and password changes', async ({ page }, testInfo) => {
  const compact = (page.viewportSize()?.width || 0) < 640
  const username = `e2e_${testInfo.project.name}_${Date.now().toString(36)}`
  const password = 'TestPassword12!'
  const checkAccessibility = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(result.violations).toEqual([])
  }
  try {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login$/)
    await checkAccessibility()
    await page.getByRole('link', { name: 'Create an account' }).click()
    await page.getByLabel('Username', { exact: true }).fill(username)
    await page.getByLabel('Password', { exact: true }).fill('weak')
    await page.getByLabel('Confirm password', { exact: true }).fill('weak')
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeDisabled()
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await page.getByRole('link', { name: 'Library', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible()
    await expect(page.getByText('Your next good find starts here.')).toBeVisible()
    await page.getByLabel('URL to save').fill('github.com/supabase/supabase')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByLabel('URL', { exact: true })).toHaveValue(
      'https://github.com/supabase/supabase',
    )
    await expect(page.getByRole('dialog').getByLabel('Source', { exact: true })).toHaveValue(
      'GitHub',
    )
    await expect(page.getByRole('dialog').getByLabel('Title', { exact: true })).toBeFocused()
    await checkAccessibility()
    await page.getByLabel('Title', { exact: true }).fill('Supabase reference')
    await page.getByLabel('Note (optional)').fill('Backend tools worth revisiting.')
    await page.getByLabel('Tags', { exact: true }).fill('backend')
    await page.getByLabel('Tags', { exact: true }).press(',')
    await page.getByLabel('Tags', { exact: true }).fill('tools')
    await page.getByLabel('Tags', { exact: true }).press('Enter')
    await page.getByRole('button', { name: 'Save link', exact: true }).click()
    const article = page.getByRole('article').filter({ hasText: 'Supabase reference' })
    await expect(article).toBeVisible()
    await expect(article.getByRole('button', { name: 'Filter by backend' })).toBeVisible()
    const savedDate = await article.locator('time').getAttribute('datetime')
    await page.reload()
    await expect(article).toBeVisible()
    await expect(article.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
    await page.getByLabel('URL to save').fill('https://github.com/supabase/supabase')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText(/You saved this on/)).toBeVisible()
    await page.getByRole('button', { name: 'Edit the saved link' }).click()
    await expect(page.getByRole('heading', { name: 'Edit link', exact: true })).toBeVisible()
    await page.getByLabel('Title', { exact: true }).fill('Supabase handbook')
    await page.getByRole('button', { name: 'Save changes' }).click()
    const edited = page.getByRole('article').filter({ hasText: 'Supabase handbook' })
    await expect(edited).toBeVisible()
    await expect(edited.locator('time')).toHaveAttribute('datetime', savedDate!)
    await page.getByLabel('URL to save').fill('https://youtu.be/example')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByLabel('Title', { exact: true }).fill('A useful video')
    await page.getByLabel('Tags', { exact: true }).fill('video')
    await page.getByLabel('Tags', { exact: true }).press('Enter')
    await page.getByRole('button', { name: 'Save link', exact: true }).click()
    await expect(page.getByRole('article')).toHaveCount(2)
    await edited.getByRole('button', { name: 'Filter by backend' }).click()
    await expect(page).toHaveURL(/tags=backend/)
    await expect(page.getByRole('article')).toHaveCount(1)
    if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByLabel('Filter by tags').fill('video')
    await page.getByRole('option', { name: 'video', exact: true }).click()
    await expect(page.getByText('No links match just yet.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
    await expect(page.getByRole('article')).toHaveCount(2)
    await page.getByLabel('Search links').fill('handbook')
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(page).toHaveURL(/q=handbook/)
    await page.reload()
    await expect(page.getByLabel('Search links')).toHaveValue('handbook')
    await expect(page.getByRole('article')).toHaveCount(1)
    if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
    await page.getByRole('link', { name: 'Tags', exact: true }).click()
    await page.getByRole('button', { name: 'Rename backend', exact: true }).click()
    await page.getByLabel('New tag name for backend').fill('development')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('link', { name: 'development', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Delete tools', exact: true }).click()
    await expect(
      page.getByText('This removes the tag from 1 link. All of your links will be kept.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Delete tag', exact: true }).click()
    await page.getByRole('link', { name: 'Library', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Filter by development' })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(2)
    mkdirSync('.local', { recursive: true })
    await page.screenshot({
      path: `.local/${testInfo.project.name}-library.png`,
      fullPage: !testInfo.project.use.hasTouch,
    })
    await checkAccessibility()
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      await page.locator('body').evaluate((el) => el.clientWidth),
    )
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await page.getByRole('button', { name: 'Theme: system. Cycle theme.', exact: true }).click()
    await page.getByRole('button', { name: 'Theme: light. Cycle theme.', exact: true }).click()
    await expect(page.locator('html')).toHaveClass('dark')
    await page.reload()
    await expect(page.locator('html')).toHaveClass('dark')
    await page.getByLabel('Current password').fill(password)
    await page.getByLabel('New password', { exact: true }).fill('ChangedPassword34!')
    await page.getByLabel('Confirm new password').fill('ChangedPassword34!')
    await page.getByRole('button', { name: 'Update password', exact: true }).click()
    await expect(page.getByText('Password changed.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.getByLabel('Username', { exact: true }).fill(username)
    await page.getByLabel('Password', { exact: true }).fill('ChangedPassword34!')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await page.getByRole('link', { name: 'Library', exact: true }).click()
    await expect(page.getByRole('article')).toHaveCount(2)
    const video = page.getByRole('article').filter({ hasText: 'A useful video' })
    const openDelete = async () => {
      await video.getByRole('button', { name: 'Actions for A useful video' }).click()
      if (compact) {
        await page
          .getByRole('dialog', { name: 'Link actions' })
          .getByRole('button', { name: 'Delete link' })
          .click()
      } else {
        await page.getByRole('menuitem', { name: 'Delete' }).click()
      }
    }
    await openDelete()
    await page.getByRole('button', { name: 'Keep link' }).click()
    await expect(page.getByRole('article')).toHaveCount(2)
    await openDelete()
    await page.getByRole('button', { name: 'Delete link', exact: true }).click()
    await expect(page.getByRole('article')).toHaveCount(1)
    await page.screenshot({
      path: `.local/${testInfo.project.name}-dark.png`,
      fullPage: !testInfo.project.use.hasTouch,
    })
    await checkAccessibility()
    if (testInfo.project.name === 'desktop') {
      await page.locator('body').click({ position: { x: 5, y: 500 } })
      await page.keyboard.press('/')
      await expect(page.getByLabel('Search links')).toBeFocused()
      await page.getByLabel('Search links').blur()
      await page.keyboard.press('n')
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).not.toBeVisible()
    }
    const api = createClient(local.API_URL, local.PUBLISHABLE_KEY || local.ANON_KEY, {
      auth: { persistSession: false },
    })
    await api.auth.signInWithPassword({
      email: `${username}@users.scratch-pad.test`,
      password: 'ChangedPassword34!',
    })
    const { error } = await api.from('links').insert(
      Array.from({ length: 51 }, (_, index) => ({
        url: `https://example.com/${index}`,
        title: `Extra ${index}`,
        source: index < 40 ? 'Pagination' : 'Other',
      })),
    )
    expect(error).toBeNull()
    await page.reload()
    const pagination = page.getByRole('navigation', { name: 'Link pagination' })
    const previous = pagination.getByRole('button', { name: 'Previous page' })
    const next = pagination.getByRole('button', { name: 'Next page' })
    await expect(page.getByRole('article')).toHaveCount(20)
    await expect(previous).toBeDisabled()
    await expect(page.getByText('Showing 1–20 saved links', { exact: true })).toBeVisible()
    await next.click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('article')).toHaveCount(20)
    await expect(page.getByText('Showing 21–40 saved links', { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Saved links, page 2' })).toBeFocused()
    await page.reload()
    await expect(pagination).toContainText('Page 2')
    await next.click()
    await expect(page.getByRole('article')).toHaveCount(12)
    await expect(page.getByText('Showing 41–52 saved links', { exact: true })).toBeVisible()
    await expect(next).toBeDisabled()
    await page.goBack()
    await expect(pagination).toContainText('Page 2')
    await page.goForward()
    await expect(pagination).toContainText('Page 3')
    await previous.click()
    await expect(pagination).toContainText('Page 2')
    await page.getByLabel('Search links').fill('Extra')
    await expect(page).toHaveURL(/q=Extra/)
    expect(new URL(page.url()).searchParams.has('page')).toBe(false)
    await expect(pagination).toContainText('Page 1')
    await next.click()
    await expect(pagination).toContainText('Page 2')
    if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.locator(compact ? '#mobile-source' : '#desktop-source').click()
    await page.getByRole('option', { name: 'Pagination', exact: true }).click()
    await expect(pagination).toContainText('Page 1')
    await expect(page.getByText('Showing 1–20 matching links', { exact: true })).toBeVisible()
    await next.click()
    await expect(page.getByRole('article')).toHaveCount(20)
    await expect(pagination).toContainText('Page 2')
    await expect(next).toBeDisabled()
    await checkAccessibility()
    await page.goto('/?page=999')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('article')).toHaveCount(20)
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

test('browser history, rapid filtering, shortcuts and account cache isolation', async ({
  page,
}, testInfo) => {
  const compact = (page.viewportSize()?.width || 0) < 640
  const prefix = `nav_${testInfo.project.name}_${Date.now().toString(36)}`
  const password = 'TestPassword12!'
  const clients = [0, 1].map(() =>
    createClient(local.API_URL, local.PUBLISHABLE_KEY || local.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  )
  try {
    for (const [index, client] of clients.entries()) {
      const username = `${prefix}_${index}`
      const { error } = await client.auth.signUp({
        email: `${username}@users.scratch-pad.test`,
        password,
        options: { data: { username } },
      })
      expect(error).toBeNull()
    }
    for (const draft of [
      {
        p_url: 'https://github.com/alpha',
        p_title: 'Alpha reference',
        p_source: 'GitHub',
        p_tag_names: ['c,plus'],
      },
      { p_url: 'https://youtu.be/beta', p_title: 'Beta video', p_source: 'YouTube' },
    ]) {
      expect((await clients[0].rpc('save_link', draft)).error).toBeNull()
    }
    expect(
      (
        await clients[1].rpc('save_link', {
          p_url: 'https://example.com/private',
          p_title: 'Private B link',
        })
      ).error,
    ).toBeNull()
    const login = async (index: number) => {
      await page.getByLabel('Username', { exact: true }).fill(`${prefix}_${index}`)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible()
    }
    await page.goto('/login')
    await login(0)
    await expect(page.getByRole('article')).toHaveCount(2)
    await expect(page.getByRole('article').first()).toContainText('Beta video')
    await page.getByLabel('URL to save').fill('https://example.com')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('dialog').getByLabel('URL', { exact: true }).fill('javascript:alert(1)')
    await page.getByRole('button', { name: 'Save link', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'Only http:// and https:// links can be saved.',
    )
    await page
      .getByRole('button', { name: compact ? 'Close dialog' : 'Cancel', exact: true })
      .click()
    if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByLabel('Search links').fill('Alpha')
    const source = page.locator(compact ? '#mobile-source' : '#desktop-source')
    await source.click()
    await page.getByRole('option', { name: 'GitHub', exact: true }).click()
    await expect(page).toHaveURL(/q=Alpha/)
    await expect(source).toHaveText('GitHub')
    expect(new URL(page.url()).searchParams.get('source')).toBe('GitHub')
    await expect(page.getByRole('article')).toHaveCount(1)
    await page.goBack()
    const previousQuery = new URL(page.url()).searchParams.get('q') || ''
    await expect(page.getByLabel('Search links')).toHaveValue(previousQuery)
    await expect(source).toHaveText('All sources')
    await expect(page.getByRole('article')).toHaveCount(previousQuery ? 1 : 2)
    await page.goForward()
    await expect(page.getByLabel('Search links')).toHaveValue('Alpha')
    await expect(page.getByRole('article')).toHaveCount(1)
    await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
    await expect(page.getByLabel('Search links')).toHaveValue('')
    await expect(source).toHaveText('All sources')
    await expect(page.getByRole('article')).toHaveCount(2)
    const sort = page.locator(compact ? '#mobile-sort' : '#desktop-sort')
    await sort.click()
    await page.getByRole('option', { name: 'Title A–Z', exact: true }).click()
    await expect(page.getByRole('article').first()).toContainText('Alpha reference')
    await page.reload()
    if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
    await expect(sort).toHaveText('Title A–Z')
    await source.click()
    await page.getByRole('option', { name: 'YouTube', exact: true }).click()
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(page.getByRole('article').first()).toContainText('Beta video')
    await page.goBack()
    await expect(page.getByRole('article')).toHaveCount(2)
    await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
    await page.getByRole('button', { name: 'Filter by c,plus', exact: true }).click()
    await expect(page.getByRole('article')).toHaveCount(1)
    await page.reload()
    await expect(page.getByRole('article')).toHaveCount(1)
    if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
    await page.locator('body').click({ position: { x: 3, y: 500 } })
    await page.evaluate(() => {
      const clipboardData = new DataTransfer()
      clipboardData.setData('text', 'example.com/blog/useful-article')
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }))
    })
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel('URL', { exact: true })).toHaveValue(
      'https://example.com/blog/useful-article',
    )
    await page.keyboard.press('Control+Enter')
    await expect(page.getByRole('article').filter({ hasText: 'Useful article' })).toBeVisible()
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await login(1)
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(page.getByRole('article')).toContainText('Private B link')
    await expect(page.getByText('Alpha reference', { exact: true })).not.toBeVisible()
  } finally {
    execFileSync(
      'psql',
      [
        local.DB_URL,
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        `delete from auth.users where raw_user_meta_data->>'username' in ('${prefix}_0', '${prefix}_1');`,
      ],
      { stdio: 'ignore' },
    )
  }
})
