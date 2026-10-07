import { describe, expect, it } from 'vitest'
import { parseShare } from '../src/lib/share'
import { APP_URL, shareUrl } from './share-url.js'

describe('extension share URL', () => {
  it('encodes the page URL and title for the app', () => {
    const url = 'https://example.com/article?q=a&sort=b#heading'
    const title = 'Read this & that? #1'
    const target = new URL(shareUrl({ url, title }))
    expect(target.origin).toBe(APP_URL)
    expect(target.pathname).toBe('/share')
    expect(target.searchParams.get('url')).toBe(url)
    expect(target.searchParams.get('title')).toBe(title)
    expect(target.searchParams.get('popup')).toBe('1')
    expect(parseShare(target.searchParams)).toEqual({ url, title })
  })

  it.each(['chrome://extensions', 'about:blank', 'file:///tmp/note.html', '', undefined])(
    'opens an empty popup add dialog for %s',
    (url) => {
      expect(shareUrl({ url, title: 'Non-web page' })).toBe(`${APP_URL}/?add=1&popup=1`)
    },
  )

  it('passes selections to the app for URL extraction', () => {
    const text = 'check this https://example.com/x.'
    const target = new URL(shareUrl({ text }))
    expect(target.pathname).toBe('/share')
    expect(target.searchParams.get('url')).toBeNull()
    expect(target.searchParams.get('text')).toBe(text)
    expect(target.searchParams.get('popup')).toBe('1')
    expect(parseShare(target.searchParams)).toEqual({
      url: 'https://example.com/x',
      title: 'check this .',
    })
  })

  it('leaves selection validation to the app', () => {
    const target = new URL(shareUrl({ url: 'javascript:alert(1)', text: 'no link here' }))
    expect(target.pathname).toBe('/share')
    expect(target.searchParams.has('url')).toBe(false)
    expect(target.searchParams.get('popup')).toBe('1')
    expect(parseShare(target.searchParams)).toEqual({
      error: "That share didn't include a web link.",
    })
  })

  it('round-trips Unicode and URL delimiters through the app parser', () => {
    const url = 'https://example.com/%E6%97%A5%E6%9C%AC?q=%E2%9C%93&next=a?b#section'
    const title = '日本語 • café & ideas? #1 🔗'
    const target = new URL(shareUrl({ url, title }))
    expect(parseShare(target.searchParams)).toEqual({ url, title })
    expect(target.searchParams.get('popup')).toBe('1')
  })

  it('supports a local app URL for both share and empty-add popups', () => {
    const app = 'http://127.0.0.1:5173'
    expect(new URL(shareUrl({ url: 'https://example.com' }, app)).origin).toBe(app)
    expect(shareUrl({}, app)).toBe(`${app}/?add=1&popup=1`)
  })

  it('accepts an uppercase web scheme and omits an unavailable link title', () => {
    const target = new URL(shareUrl({ url: 'HTTPS://example.com/x' }))
    expect(target.searchParams.get('url')).toBe('HTTPS://example.com/x')
    expect(target.searchParams.has('title')).toBe(false)
    expect(parseShare(target.searchParams)).toEqual({ url: 'https://example.com/x', title: '' })
  })
})
