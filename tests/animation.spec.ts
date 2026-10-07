import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { test, expect, type Locator } from '@playwright/test'

const local = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)

// Inspect real CSS transitions at transitionrun, before a fast exit can unmount.
async function inspectTransition(
  trigger: Locator,
  selector: string,
  action: 'click' | 'escape' = 'click',
) {
  await trigger.focus()
  return trigger.evaluate(
    (element, { selector, action }) =>
      new Promise<{
        entering: boolean
        leaving: boolean
        transform: string
        properties: string[]
        durations: number[]
        attached: boolean
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          document.removeEventListener('transitionrun', onTransition)
          reject(new Error(`No transition ran on ${selector}`))
        }, 2000)
        function onTransition(event: TransitionEvent) {
          const target = event.target
          if (!(target instanceof HTMLElement) || !target.matches(selector)) return
          clearTimeout(timeout)
          document.removeEventListener('transitionrun', onTransition)
          const animations = target.getAnimations().filter((item) => item instanceof CSSTransition)
          resolve({
            entering: target.hasAttribute('data-enter'),
            leaving: target.hasAttribute('data-leave'),
            transform: getComputedStyle(target).transform,
            properties: animations.map((item) => item.transitionProperty).sort(),
            durations: animations.map((item) => Number(item.effect!.getTiming().duration)),
            attached: target.isConnected,
          })
        }
        document.addEventListener('transitionrun', onTransition)
        if (action === 'escape') {
          element.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
          )
        } else {
          ;(element as HTMLElement).click()
        }
      }),
    { selector, action },
  )
}

test('motion, exit retention, focus restoration and reduced motion', async ({ page }, info) => {
  const mobile = (page.viewportSize()?.width || 0) < 640
  const username = `motion_${info.project.name}_${Date.now().toString(36)}`
  const password = 'TestPassword12!'
  const api = createClient(local.API_URL, local.PUBLISHABLE_KEY || local.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
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
          p_url: 'https://example.com/motion',
          p_title: 'Motion reference',
          p_description: 'A useful note to revisit.\n'.repeat(80),
          p_source: 'Example',
          p_tag_names: ['motion', 'reference'],
        })
      ).error,
    ).toBeNull()
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/login')
    await page.getByLabel('Username', { exact: true }).fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('article')).toHaveCount(1)

    const more = page.getByRole('button', { name: 'View full note for Motion reference' })
    const dialog = page.getByRole('dialog')
    const panel = dialog.locator('[data-modal-panel]')
    const opening = await inspectTransition(more, '.modal-panel')
    expect(opening.entering).toBe(true)
    expect(opening.attached).toBe(true)
    expect(opening.durations).toEqual(mobile ? [200] : [150, 150])
    expect(opening.properties).toEqual(mobile ? ['transform'] : ['opacity', 'transform'])
    expect(opening.transform).not.toBe('none')
    await expect(panel).not.toHaveAttribute('data-enter')
    if (mobile) {
      const box = await panel.boundingBox()
      expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.85 + 1)
      expect(Math.round(box!.y + box!.height)).toBe(page.viewportSize()!.height)
    }
    mkdirSync('.local/animation', { recursive: true })
    await page.screenshot({ path: `.local/animation/${info.project.name}-note.png` })
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const copyNote = dialog.getByRole('button', { name: 'Copy note to clipboard' })
    await copyNote.click()
    await expect(copyNote.locator('[data-copied]')).toBeVisible()
    await expect(copyNote.locator('[data-copied]')).toHaveCount(0)
    const closing = await inspectTransition(
      dialog.getByRole('button', { name: 'Done', exact: true }),
      '.modal-panel',
    )
    expect(closing.leaving).toBe(true)
    expect(closing.attached).toBe(true)
    expect(closing.durations.every((duration) => duration === 150)).toBe(true)
    await expect(dialog).toHaveCount(0)
    await expect(more).toBeFocused()

    // Page dialogs enter spatially and retain their inputs through dismissal.
    await page.getByLabel('URL to save').fill('https://example.com/new-motion')
    expect(
      (
        await inspectTransition(
          page.getByRole('button', { name: 'Save', exact: true }),
          '.modal-panel',
        )
      ).entering,
    ).toBe(true)
    await expect(dialog.getByLabel('Title', { exact: true })).toBeFocused()
    await dialog.getByRole('button', { name: 'Close dialog' }).click()
    await expect(dialog).toHaveCount(0)

    const filters = page.getByRole('button', { name: /^Filters/ })
    const accordion = page.locator('#library-filters')
    if (mobile) {
      await expect(accordion).toHaveAttribute('inert')
      const expansion = await inspectTransition(filters, '.filter-accordion')
      expect(expansion.properties).toContain('grid-template-rows')
      expect(expansion.durations).toEqual([200, 200])
      await expect(accordion).not.toHaveAttribute('inert')
    }
    const source = page.locator(mobile ? '#mobile-source' : '#desktop-source')
    const dropdown = await inspectTransition(source, '.dropdown-panel')
    expect(dropdown.durations).toEqual([120, 120])
    expect(dropdown.properties).toEqual(['opacity', 'transform'])
    await expect(page.getByRole('listbox')).not.toHaveAttribute('data-enter')
    const dropdownExit = await inspectTransition(
      page.getByRole('listbox'),
      '.dropdown-panel[data-leave]',
      'escape',
    )
    expect(dropdownExit.leaving).toBe(true)
    expect(dropdownExit.attached).toBe(true)
    expect(dropdownExit.durations).toEqual([75, 75])
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await source.click()
    await page.getByRole('option', { name: 'Example', exact: true }).click()
    await expect(page).toHaveURL(/source=Example/)
    await expect(page.getByRole('listbox')).toHaveCount(0)
    const tagsOpening = await inspectTransition(
      page.getByRole('button', { name: 'Show tag filters' }),
      '.dropdown-panel',
    )
    expect(tagsOpening.durations).toEqual([120, 120])
    await expect(page.getByRole('listbox')).toHaveCSS('transition-duration', '0.12s, 0.12s')
    await expect(page.getByRole('listbox')).not.toHaveAttribute('data-enter')
    await page.getByLabel('Filter by tags').press('Escape')
    await expect(page.getByRole('listbox')).toHaveCount(0)
    if (mobile) {
      await inspectTransition(filters, '.filter-accordion')
      await expect(accordion).toHaveAttribute('inert')
      const chip = page.getByRole('button', { name: 'Remove source filter Example' })
      const dismissal = await inspectTransition(chip, '.filter-chip')
      expect(dismissal.properties).toContain('grid-template-columns')
      expect(dismissal.durations.every((duration) => duration === 150)).toBe(true)
      await expect(page).not.toHaveURL(/source=/)
      await expect(chip).toHaveCount(0)
    }
    const menu = await inspectTransition(
      page.getByRole('button', { name: 'Account menu' }),
      '.dropdown-panel[role="menu"]',
    )
    expect(menu.durations).toEqual([120, 120])
    await page.getByRole('menu').press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await more.click()
    await expect(panel).toHaveCSS('transition-duration', '0s')
    await expect(panel).toHaveCSS('transform', 'none')
    await expect(panel).toHaveCSS('transition-delay', '0s')
    expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0)
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(more).toBeFocused()
    if (mobile) {
      await filters.click()
      await expect(accordion).not.toHaveAttribute('inert')
      await expect(accordion).toHaveCSS('transition-duration', '0s')
      await expect(accordion).toHaveCSS('transition-delay', '0s')
    }
    await source.click()
    await expect(page.getByRole('listbox')).toHaveCSS('transform', 'none')
    await expect(page.getByRole('listbox')).toHaveCSS('transition-duration', '0s')
    await page.getByRole('listbox').press('Escape')
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
