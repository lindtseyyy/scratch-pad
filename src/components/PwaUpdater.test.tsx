// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import axe from 'axe-core'
import { PwaUpdater } from './PwaUpdater'
import { ToastProvider, useToast } from './ui/Toast'

const sw = vi.hoisted(() => ({
  needRefresh: false,
  update: vi.fn<() => Promise<void>>(),
  options: undefined as RegisterSWOptions | undefined,
}))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: RegisterSWOptions) => {
    sw.options = options
    return { needRefresh: [sw.needRefresh, vi.fn()], updateServiceWorker: sw.update }
  },
}))

function SaveNotice() {
  const toast = useToast()
  return <button onClick={() => toast('Link saved.')}>Save</button>
}

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  sw.needRefresh = false
  sw.update.mockReset().mockResolvedValue(undefined)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function render() {
  await act(() =>
    root.render(
      <ToastProvider>
        <PwaUpdater />
        <SaveNotice />
      </ToastProvider>,
    ),
  )
}
async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    (button) => button.textContent === label,
  )
  expect(button).toBeDefined()
  await act(() => button!.click())
}

describe('PWA updates', () => {
  it('waits for explicit Reload and keeps the prompt beyond the toast timeout', async () => {
    await render()
    expect(container.textContent).not.toContain('A new version is ready.')
    sw.needRefresh = true
    await render()
    await act(() => vi.advanceTimersByTime(10_000))
    expect(container.textContent).toContain('A new version is ready.')
    expect(sw.update).not.toHaveBeenCalled()
    await click('Reload')
    expect(sw.update).toHaveBeenCalledExactlyOnceWith(true)
  })
  it('retains the update action when a normal toast appears and expires', async () => {
    sw.needRefresh = true
    await render()
    await click('Save')
    expect(container.textContent).toContain('Link saved.')
    await act(() => vi.advanceTimersByTime(4500))
    expect(container.textContent).not.toContain('Link saved.')
    expect(container.textContent).toContain('Reload')
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite')
  })
  it('provides accessible notification and Reload controls', async () => {
    vi.useRealTimers()
    sw.needRefresh = true
    await render()
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      // Color/layout are checked in the browser suite; jsdom has no layout engine.
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(result.violations).toEqual([])
  })
  it('allows dismissing the persistent update without reloading or recreating it', async () => {
    sw.needRefresh = true
    await render()
    await act(() =>
      container.querySelector<HTMLButtonElement>('[aria-label="Dismiss notification"]')!.click(),
    )
    await click('Save')
    expect(container.textContent).not.toContain('A new version is ready.')
    expect(sw.update).not.toHaveBeenCalled()
  })
  it('does not reload a draft when another tab activates the update', async () => {
    sw.needRefresh = true
    await render()
    const consoleError = vi.spyOn(console, 'error')
    // jsdom reports an attempted page reload as a not-implemented error.
    await act(() => sw.options!.onNeedReload!())
    expect(consoleError).not.toHaveBeenCalled()
    expect(sw.update).not.toHaveBeenCalled()
    expect(container.textContent).toContain('A new version is ready.')
  })
  it('checks on returning to the app, at most hourly, and only online', async () => {
    await render()
    const update = vi.fn().mockResolvedValue(undefined)
    sw.options!.onRegisteredSW!('/sw.js', { update } as unknown as ServiceWorkerRegistration)
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const notify = () => document.dispatchEvent(new Event('visibilitychange'))
    notify()
    expect(update).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60 * 60 * 1000)
    visibility.mockReturnValue('hidden')
    notify()
    expect(update).not.toHaveBeenCalled()
    visibility.mockReturnValue('visible')
    online.mockReturnValue(false)
    notify()
    expect(update).not.toHaveBeenCalled()
    online.mockReturnValue(true)
    notify()
    notify()
    expect(update).toHaveBeenCalledTimes(1)
    await act(() => root.unmount())
    vi.advanceTimersByTime(60 * 60 * 1000)
    notify()
    expect(update).toHaveBeenCalledTimes(1)
  })
  it('keeps Reload available if applying the update fails', async () => {
    sw.needRefresh = true
    sw.update.mockRejectedValue(new Error('offline'))
    await render()
    await click('Reload')
    expect(container.textContent).toContain('The update could not load. Try Reload again.')
    expect(container.textContent).toContain('A new version is ready.')
  })
})
