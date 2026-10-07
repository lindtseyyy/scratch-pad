// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { ToastProvider } from '../../components/ui/Toast'
import { LinkRow } from './LinkRow'
import type { SavedLink } from './api'

const link: SavedLink = {
  id: 'link-1',
  user_id: 'user-1',
  url: 'https://github.com/example/project',
  title: 'Building Modern Web Apps at Scale',
  source: 'GitHub',
  description:
    'Great guide on optimizing Vite bundle sizes with concrete before-and-after measurements worth revisiting.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tags: [
    { id: 't1', name: 'frontend' },
    { id: 't2', name: 'vite' },
    { id: 't3', name: 'performance' },
  ],
}

const handlers = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onTag: vi.fn(),
}

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  handlers.onEdit.mockClear()
  handlers.onDelete.mockClear()
  handlers.onTag.mockClear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function renderRow(density: 'detailed' | 'compact' = 'detailed') {
  await act(() =>
    root.render(
      <ToastProvider>
        <LinkRow link={link} density={density} {...handlers} />
      </ToastProvider>,
    ),
  )
}

function click(element: Element) {
  return act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function waitForDialogExit() {
  await vi.waitFor(async () => {
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
}

function sheetTrigger() {
  // The mobile sheet trigger precedes the desktop menu in DOM order.
  return container.querySelectorAll(`button[aria-label="Actions for ${link.title}"]`)[0]
}

describe('LinkRow', () => {
  it('renders favicon, domain, source and relative time in detailed mode', async () => {
    await renderRow()
    const icon = container.querySelector('img')
    expect(icon?.getAttribute('src')).toContain('google.com/s2/favicons')
    expect(icon?.getAttribute('src')).toContain('github.com')
    expect(container.textContent).toContain('github.com')
    expect(container.textContent).toContain('GitHub')
    expect(container.querySelector('time')?.textContent).toMatch(/Just now|\d+[mhd] ago/)
    const title = container.querySelector('a[aria-label]')
    expect(title?.getAttribute('aria-label')).toContain('Building Modern Web Apps at Scale')
    expect(title?.getAttribute('aria-label')).toContain('github.com')
  })

  it('opens a modal when viewing more of a long note', async () => {
    await renderRow()
    const note = container.querySelector('[class*="border-accent"] p')
    expect(note?.className).toContain('line-clamp-2')
    await click(container.querySelector(`button[aria-label="View full note for ${link.title}"]`)!)
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.textContent).toContain(link.description)
    expect(
      document.body.querySelector('button[aria-label="Copy note to clipboard"]'),
    ).not.toBeNull()
  })

  it('renders every tag in a scrollable rail', async () => {
    await renderRow()
    const rail = container.querySelector('[data-tag-rail]')
    expect(rail?.className).toContain('overflow-x-auto')
    const chips = [...container.querySelectorAll('[data-row-tag]')]
    expect(chips.map((chip) => chip.textContent)).toEqual(['frontend', 'performance', 'vite'])
    await click(chips[0])
    expect(handlers.onTag).toHaveBeenCalledWith('frontend')
  })

  it('confirms a successful copy for 1.2 seconds with a haptic and toast', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText }, vibrate })
    await renderRow()
    await click(
      container.querySelector(`button[aria-label="Copy link address for ${link.title}"]`)!,
    )
    expect(writeText).toHaveBeenCalledWith(link.url)
    expect(container.textContent).toContain('Link address copied.')
    expect(container.querySelector('[data-copied]')).not.toBeNull()
    expect(vibrate).toHaveBeenCalledWith(10)
    await act(() => vi.advanceTimersByTime(1199))
    expect(container.querySelector('[data-copied]')).not.toBeNull()
    await act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('[data-copied]')).toBeNull()
  })

  it('does not show a success icon or buzz when copying fails', async () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) },
      vibrate,
    })
    await renderRow()
    await click(
      container.querySelector(`button[aria-label="Copy link address for ${link.title}"]`)!,
    )
    expect(container.textContent).toContain('Could not copy this link.')
    expect(container.querySelector('[data-copied]')).toBeNull()
    expect(vibrate).not.toHaveBeenCalled()
    expect(document.body.querySelector('textarea')).toBeNull()
  })

  it('renders a single-line compact row with a tag count badge', async () => {
    await renderRow('compact')
    expect(container.querySelector('[data-tag-rail]')).toBeNull()
    expect(container.querySelector('button[aria-label="Show more of the note"]')).toBeNull()
    const title = container.querySelector('article a')
    expect(title?.className).toContain('truncate')
    expect(title?.textContent).toBe(link.title)
    expect(container.textContent).toContain('github.com')
    expect(container.querySelector('span[aria-label="3 tags"]')?.textContent).toBe('3')
  })

  it('opens a bottom sheet with copy, share, edit, delete and tag filters', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await renderRow()
    await click(sheetTrigger())
    const sheet = document.body.querySelector('[role="dialog"]')!
    expect(sheet.textContent).toContain('Link actions')
    expect(sheet.querySelector('a[href="https://github.com/example/project"]')).not.toBeNull()

    await click(sheet.querySelector('button[aria-label="Filter by vite"]')!)
    expect(handlers.onTag).toHaveBeenCalledWith('vite')
    await waitForDialogExit()

    await click(sheetTrigger())
    const deleteSheet = document.body.querySelector('[role="dialog"]')!
    await click(
      [...deleteSheet.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Delete link'),
      )!,
    )
    await waitForDialogExit()
    expect(handlers.onDelete).toHaveBeenCalledOnce()

    await click(sheetTrigger())
    const reopened = document.body.querySelector('[role="dialog"]')!
    await click(
      [...reopened.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Edit details'),
      )!,
    )
    await waitForDialogExit()
    expect(handlers.onEdit).toHaveBeenCalledOnce()
  })

  it('meets WCAG 2.1 AA rules in both densities', async () => {
    await renderRow('detailed')
    expect((await axe.run(container)).violations).toEqual([])
    await renderRow('compact')
    expect((await axe.run(container)).violations).toEqual([])
  })
})
