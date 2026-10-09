import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_URL } from './share-url.js'

const event = () => ({ addListener: vi.fn() })
let api

beforeEach(() => {
  vi.resetModules()
  api = {
    runtime: { onInstalled: event() },
    action: { onClicked: event() },
    contextMenus: {
      onClicked: event(),
      create: vi.fn(),
      removeAll: vi.fn((done) => done()),
    },
    windows: { create: vi.fn().mockResolvedValue({ id: 1 }) },
    tabs: { create: vi.fn().mockResolvedValue({ id: 2 }) },
  }
  vi.stubGlobal('chrome', api)
})

afterEach(() => vi.unstubAllGlobals())

function popupTarget() {
  expect(api.windows.create).toHaveBeenCalledExactlyOnceWith({
    url: expect.any(String),
    type: 'popup',
    width: 480,
    height: 720,
    focused: true,
  })
  return new URL(api.windows.create.mock.calls[0][0].url)
}

describe('extension background events', () => {
  it('registers handlers immediately without opening a window on startup', async () => {
    const { installMenus, savePage, handleContextMenu } = await import('./background.js')
    expect(api.runtime.onInstalled.addListener).toHaveBeenCalledExactlyOnceWith(installMenus)
    expect(api.action.onClicked.addListener).toHaveBeenCalledExactlyOnceWith(savePage)
    expect(api.contextMenus.onClicked.addListener).toHaveBeenCalledExactlyOnceWith(
      handleContextMenu,
    )
    expect(api.windows.create).not.toHaveBeenCalled()
    expect(api.contextMenus.create).not.toHaveBeenCalled()
  })

  it('replaces all four menus on installation and updates', async () => {
    const menus = new Map()
    api.contextMenus.removeAll.mockImplementation((done) => {
      menus.clear()
      done()
    })
    api.contextMenus.create.mockImplementation((menu) => {
      if (menus.has(menu.id)) throw new Error('Duplicate menu ID')
      menus.set(menu.id, menu)
    })
    await import('./background.js')
    const [installed] = api.runtime.onInstalled.addListener.mock.calls[0]
    installed({ reason: 'install' })
    installed({ reason: 'update' })
    expect([...menus.values()]).toEqual([
      { id: 'link', title: 'Save link to Scratch-Pad', contexts: ['link'] },
      { id: 'page', title: 'Save page to Scratch-Pad', contexts: ['page'] },
      { id: 'selection', title: 'Save link in selection', contexts: ['selection'] },
      { id: 'library', title: 'Open Scratch-Pad', contexts: ['action'] },
    ])
  })

  it('opens the action/shortcut page with its URL and title', async () => {
    await import('./background.js')
    const [clicked] = api.action.onClicked.addListener.mock.calls[0]
    await clicked({ url: 'https://example.com/article?a=1&b=2', title: 'An article & notes' })
    const target = popupTarget()
    expect(target.origin).toBe(APP_URL)
    expect(target.searchParams.get('url')).toBe('https://example.com/article?a=1&b=2')
    expect(target.searchParams.get('title')).toBe('An article & notes')
    expect(target.searchParams.get('popup')).toBe('1')
  })

  it.each([undefined, { url: 'chrome://extensions' }, { url: 'about:blank' }])(
    'opens an empty add dialog when page metadata is unavailable: %j',
    async (tab) => {
      const { savePage } = await import('./background.js')
      await savePage(tab)
      expect(popupTarget().href).toBe(`${APP_URL}/?add=1&popup=1`)
    },
  )

  it.each([undefined, 'The Firefox link title'])(
    'saves the clicked link with title %s',
    async (title) => {
      await import('./background.js')
      const [clicked] = api.contextMenus.onClicked.addListener.mock.calls[0]
      await clicked(
        { menuItemId: 'link', linkUrl: 'https://example.com/link', linkText: title },
        { url: 'https://example.com/page', title: 'The page title' },
      )
      const target = popupTarget()
      expect(target.searchParams.get('url')).toBe('https://example.com/link')
      expect(target.searchParams.get('title')).toBe(title || null)
    },
  )

  it('saves a page from its context menu', async () => {
    const { handleContextMenu } = await import('./background.js')
    await handleContextMenu(
      { menuItemId: 'page' },
      { url: 'https://example.com/page', title: 'Page' },
    )
    expect(popupTarget().searchParams.get('title')).toBe('Page')
  })

  it('passes selected text without substituting the containing page', async () => {
    const { handleContextMenu } = await import('./background.js')
    await handleContextMenu(
      { menuItemId: 'selection', selectionText: 'read https://example.com/selected.' },
      { url: 'https://example.com/page' },
    )
    const target = popupTarget()
    expect(target.searchParams.get('text')).toBe('read https://example.com/selected.')
    expect(target.searchParams.has('url')).toBe(false)
  })

  it('opens the library in a normal tab and ignores unrelated menus', async () => {
    const { handleContextMenu } = await import('./background.js')
    await handleContextMenu({ menuItemId: 'library' })
    await handleContextMenu({ menuItemId: 'other-extension-menu' })
    expect(api.tabs.create).toHaveBeenCalledExactlyOnceWith({ url: APP_URL })
    expect(api.windows.create).not.toHaveBeenCalled()
  })
})
