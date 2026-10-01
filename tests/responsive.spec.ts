import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const local = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)

async function checkScreen(page: Page, info: TestInfo, screen: string, theme: string) {
  await page.locator('.route-enter').evaluateAll(async (elements) => {
    await Promise.all(
      elements.flatMap((element) =>
        element.getAnimations().map((animation) => animation.finished.catch(() => {})),
      ),
    )
  })
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true)
  const misalignedDropdowns = await page
    .locator('button[aria-haspopup="listbox"]:visible, input[role="combobox"]:visible')
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const field = element.getBoundingClientRect()
        const arrow = (element.matches('button') ? element : element.parentElement)
          ?.querySelector('svg')
          ?.getBoundingClientRect()
        return arrow && Math.abs(field.y + field.height / 2 - arrow.y - arrow.height / 2) <= 1
          ? []
          : [element.id]
      }),
    )
  expect(misalignedDropdowns).toEqual([])
  if (info.project.use.hasTouch) {
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    const undersized = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, a, [role="menuitem"], [role="option"]')]
        .filter((element) => {
          const rect = element.getBoundingClientRect()
          return (
            rect.width &&
            rect.height &&
            getComputedStyle(element).visibility !== 'hidden' &&
            !element.closest('[inert]') &&
            !(element.tagName === 'A' && element.closest('p')) &&
            !element.classList.contains('sr-only')
          )
        })
        .flatMap((element) => {
          const rect = element.getBoundingClientRect()
          return rect.width >= 44 && rect.height >= 44
            ? []
            : [
                {
                  name: element.getAttribute('aria-label') || element.textContent?.trim(),
                  width: rect.width,
                  height: rect.height,
                },
              ]
        }),
    )
    expect(undersized).toEqual([])
    await expect(page.locator('kbd:visible')).toHaveCount(0)
    await expect(page.getByText('Ctrl / ⌘ + Enter to save')).not.toBeVisible()
    const smallInputs = await page
      .locator('input:visible, textarea:visible, button.input[aria-haspopup="listbox"]:visible')
      .evaluateAll((elements) =>
        elements
          .filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16)
          .map((element) => element.id),
      )
    expect(smallInputs).toEqual([])
  }
  mkdirSync('.local/responsive', { recursive: true })
  await page.screenshot({
    path: `.local/responsive/${info.project.name}-${screen}-${theme}.png`,
    // Preserve the device viewport: full-page capture resets Chromium's touch emulation.
    fullPage: false,
  })
}

async function checkSelectDropdown(
  page: Page,
  info: TestInfo,
  theme: string,
  id: string,
  screen: string,
) {
  const trigger = page.locator(`#${id}`)
  await trigger.click()
  const menu = page.getByRole('listbox')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('option', { selected: true })).toHaveCount(1)
  await expect(menu).toHaveCSS(
    'background-color',
    theme === 'dark' ? 'rgb(31, 35, 31)' : 'rgb(255, 255, 255)',
  )
  await expect(menu).toHaveCSS('outline-style', 'none')
  await expect
    .poll(async () => {
      const field = await trigger.boundingBox()
      const panel = await menu.boundingBox()
      const viewport = page.viewportSize()!
      return (
        !!field &&
        !!panel &&
        Math.abs(field.x - panel.x) <= 1 &&
        Math.abs(field.width - panel.width) <= 1 &&
        panel.y >= 0 &&
        panel.y + panel.height <= viewport.height
      )
    })
    .toBe(true)
  await checkScreen(page, info, screen, theme)
  await menu.press('ArrowDown')
  await menu.press('n')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await menu.press('Escape')
  await expect(menu).not.toBeVisible()
  await expect(trigger).toBeFocused()
}

async function checkTagDropdown(
  page: Page,
  info: TestInfo,
  theme: string,
  context: 'library' | 'dialog',
) {
  const input = page.getByLabel(context === 'library' ? 'Filter by tags' : 'Tags', { exact: true })
  await page
    .getByRole('button', {
      name: context === 'library' ? 'Show tag filters' : 'Show tag suggestions',
      exact: true,
    })
    .click()
  const menu = page.getByRole('listbox')
  await expect(menu).toBeVisible()
  await expect
    .poll(async () => {
      const field = await input.boundingBox()
      const panel = await menu.boundingBox()
      const viewport = page.viewportSize()!
      return (
        !!field &&
        !!panel &&
        Math.abs(field.x - panel.x) <= 1 &&
        Math.abs(field.width - panel.width) <= 1 &&
        panel.y >= 0 &&
        panel.y + panel.height <= viewport.height
      )
    })
    .toBe(true)
  await checkScreen(page, info, `${context}-tag-dropdown`, theme)
  await page.keyboard.press('Escape')
  await expect(menu).not.toBeVisible()
}

test('responsive screens, touch controls, filters and dialog actions', async ({ page }, info) => {
  const compact = (page.viewportSize()?.width || 0) < 640
  const username = `res_${info.project.name}_${Date.now().toString(36)}`
  const password = 'TestPassword12!'
  const api = createClient(local.API_URL, local.PUBLISHABLE_KEY || local.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const tagNames = [
    'backend',
    'docs',
    'learning',
    'reference',
    'tools',
    'video',
    'web',
    'z'.repeat(32),
  ]
  try {
    expect(
      (
        await api.auth.signUp({
          email: `${username}@users.scratch-pad.test`,
          password,
          options: { data: { username } },
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await api.rpc('save_link', {
          p_url: `https://example.com/${'long-path/'.repeat(100)}`,
          p_title: 'T'.repeat(300),
          p_source: 'S'.repeat(60),
          p_description: 'A'.repeat(300),
          p_tag_names: tagNames,
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await api.rpc('save_link', {
          p_url: 'https://github.com/responsive',
          p_title: 'Responsive reference',
          p_source: 'GitHub',
          p_tag_names: tagNames,
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await api.from('links').insert(
          Array.from({ length: 35 }, (_, index) => ({
            url: `https://example.com/responsive/${index}`,
            title: `Saved reference ${index}`,
          })),
        )
      ).error,
    ).toBeNull()

    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme })
      await page.goto('/login')
      await page.evaluate((value) => localStorage.setItem('scratch-pad-theme', value), theme)
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
      await checkScreen(page, info, 'login', theme)
      await page.getByLabel('Username', { exact: true }).fill(username)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      // A previous sign-out remembers Settings; choose the screen under test explicitly.
      await page.getByRole('link', { name: 'Library', exact: true }).click()
      await expect(page.getByRole('article')).toHaveCount(37)
      await checkScreen(page, info, 'library', theme)
      if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
      await checkSelectDropdown(
        page,
        info,
        theme,
        compact ? 'mobile-source' : 'desktop-source',
        'source-dropdown',
      )
      await checkSelectDropdown(
        page,
        info,
        theme,
        compact ? 'mobile-sort' : 'desktop-sort',
        'sort-dropdown',
      )
      await checkTagDropdown(page, info, theme, 'library')
      if (compact) await page.getByRole('button', { name: /^Filters/ }).click()
      const reference = page.getByRole('article').filter({ hasText: 'Responsive reference' })
      if (compact) {
        const moreTags = reference.getByRole('button', { name: /Show \d+ more tags/ })
        await expect(moreTags).toBeVisible()
        await moreTags.click()
        await expect(reference.getByRole('button', { name: /^Filter by / })).toHaveCount(8)
        await reference.getByRole('button', { name: 'Show fewer tags' }).click()
      }
      await reference.getByRole('button', { name: 'Filter by backend', exact: true }).click()
      await expect(page.getByRole('article')).toHaveCount(2)
      if (compact) {
        const activeFilters = page.getByRole('group', { name: 'Active filters' })
        await expect(activeFilters).toBeVisible()
        await expect(
          activeFilters.getByRole('button', { name: 'Remove tag filter backend' }),
        ).toBeVisible()
        await expect(page.getByRole('button', { name: 'Filters · 1' })).toBeVisible()
        await page.getByRole('button', { name: /^Filters/ }).click()
        await page.locator('#mobile-source').click()
        await page.getByRole('option', { name: 'GitHub', exact: true }).click()
        await page.locator('#mobile-sort').click()
        await page.getByRole('option', { name: 'Title A–Z', exact: true }).click()
        await page.getByRole('button', { name: /^Filters/ }).click()
        await expect(page.getByRole('button', { name: 'Filters · 3' })).toBeVisible()
        await expect(
          activeFilters.getByRole('button', { name: 'Remove source filter GitHub' }),
        ).toBeVisible()
        await expect(
          activeFilters.getByRole('button', { name: 'Reset sort to newest' }),
        ).toBeVisible()
        await checkScreen(page, info, 'active-filters', theme)
        await activeFilters.getByRole('button', { name: 'Remove source filter GitHub' }).click()
        await expect(page.getByRole('article')).toHaveCount(2)
      }
      await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
      await expect(page.getByRole('article')).toHaveCount(37)
      if (compact) {
        await page.evaluate(() => window.scrollTo(0, 2000))
        await expect
          .poll(() =>
            page
              .getByLabel('Search links')
              .evaluate((element) => element.getBoundingClientRect().top),
          )
          .toBeLessThan(60)
        await expect(page.getByLabel('Search links')).toBeInViewport()
        await page.evaluate(() => window.scrollTo(0, 0))
      }
      if ((page.viewportSize()?.width || 0) >= 1024) {
        const sidebar = page.getByRole('complementary', { name: 'Tag filters' })
        await expect(sidebar).toBeVisible()
        await sidebar.getByRole('button', { name: 'backend, 2 links', exact: true }).click()
        await expect(page.getByRole('article')).toHaveCount(2)
        await expect(
          sidebar.getByRole('button', { name: 'backend, 2 links', exact: true }),
        ).toHaveAttribute('aria-pressed', 'true')
        await sidebar.getByRole('button', { name: 'backend, 2 links', exact: true }).click()
        await expect(page.getByRole('article')).toHaveCount(37)
      }

      if (info.project.name === 'desktop' && theme === 'light') {
        const zoom = await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await checkScreen(page, info, 'large-text-library', theme)
        const sidebar = await page.getByRole('complementary', { name: 'Tag filters' }).boundingBox()
        const search = await page.getByLabel('Search links').boundingBox()
        expect(sidebar!.x + sidebar!.width).toBeLessThan(search!.x)
        expect(search!.width).toBeGreaterThanOrEqual(384)
        await zoom.evaluate((element) => element.parentNode?.removeChild(element))
      }

      await page.getByLabel('URL to save').fill('https://example.com/new')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByLabel('Title', { exact: true })).toBeFocused()
      const save = dialog.getByRole('button', { name: 'Save link', exact: true })
      if (compact) await expect(save).toBeInViewport()
      await checkScreen(page, info, 'add-dialog', theme)
      if (info.project.use.hasTouch) {
        await dialog.getByLabel('Tags', { exact: true }).focus()
        const popular = dialog.getByRole('group', { name: 'Most-used tags' })
        await expect(popular.getByRole('button')).toHaveCount(8)
        await popular.getByRole('button', { name: 'Add tag backend', exact: true }).click()
        await expect(dialog.getByRole('button', { name: 'Remove tag backend' })).toBeVisible()
        await checkScreen(page, info, 'tag-suggestions', theme)
      }
      await checkTagDropdown(page, info, theme, 'dialog')
      await dialog.getByLabel('Source', { exact: true }).focus()
      if (compact) await expect(save).toBeInViewport()
      if (compact && theme === 'light') {
        const portrait = page.viewportSize()!
        await page.setViewportSize({ width: portrait.height, height: portrait.width })
        await dialog.getByLabel('Title', { exact: true }).focus()
        await expect(save).toBeInViewport()
        await dialog.getByLabel('Source', { exact: true }).focus()
        await expect(save).toBeInViewport()
        await checkScreen(page, info, 'landscape-dialog', theme)
        await page.setViewportSize(portrait)
      }
      await dialog.getByRole('button', { name: 'Close dialog' }).click()

      await reference.getByRole('button', { name: 'Actions for Responsive reference' }).click()
      await checkScreen(page, info, 'row-menu', theme)
      await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
      await expect(dialog.getByRole('button', { name: 'Keep link' })).toBeFocused()
      await checkScreen(page, info, 'delete-sheet', theme)
      if (compact) {
        const panel = dialog.locator('[data-modal-panel]')
        const box = await panel.boundingBox()
        expect(box!.height).toBeLessThan(page.viewportSize()!.height)
        expect(Math.round(box!.y + box!.height)).toBe(page.viewportSize()!.height)
      }
      await dialog.getByRole('button', { name: 'Keep link' }).click()
      await page.getByRole('link', { name: 'Tags', exact: true }).click()
      await expect(page.getByRole('link', { name: 'backend', exact: true })).toBeVisible()
      await checkScreen(page, info, 'tags', theme)
      await checkSelectDropdown(page, info, theme, 'tag-sort', 'tag-sort-dropdown')
      await page.getByRole('button', { name: 'Delete backend', exact: true }).click()
      await expect(dialog.getByRole('button', { name: 'Keep tag' })).toBeFocused()
      await checkScreen(page, info, 'delete-tag-sheet', theme)
      await dialog.getByRole('button', { name: 'Keep tag' }).click()
      await page.getByRole('link', { name: 'Settings', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
      await checkScreen(page, info, 'settings', theme)
      await page.getByRole('button', { name: `Theme: ${theme}. Cycle theme.`, exact: true }).click()
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Theme: system. Cycle theme.', exact: true }).click()
      await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2)
      expect(
        await page
          .locator('meta[name="theme-color"]')
          .evaluateAll((elements) => elements.map((element) => element.getAttribute('content'))),
      ).toEqual(Array(2).fill(theme === 'light' ? '#181b18' : '#f8f8f7'))
      await page.getByRole('button', { name: 'Sign out', exact: true }).click()
      await expect(page).toHaveURL(/\/login$/)
    }
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
