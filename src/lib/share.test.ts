import { afterEach, describe, expect, it, vi } from 'vitest'
import { canShare, parseShare, shareLink } from './share'

describe('shared links', () => {
  it('prefers a browser URL and page title over selected text', () => {
    expect(
      parseShare(
        new URLSearchParams({
          url: 'https://example.com/page',
          title: 'Page title',
          text: 'Selected https://other.com/',
        }),
      ),
    ).toEqual({ url: 'https://example.com/page', title: 'Page title' })
  })
  it('accepts a YouTube URL in text', () => {
    expect(
      parseShare(new URLSearchParams({ text: 'https://youtu.be/abc123', title: 'Video' })),
    ).toEqual({ url: 'https://youtu.be/abc123', title: 'Video' })
  })
  it('extracts the first link from prose as sent by Reddit and Messenger', () => {
    expect(
      parseShare(
        new URLSearchParams({
          text: 'Look at this https://reddit.com/r/test. More https://example.com',
        }),
      ),
    ).toEqual({
      url: 'https://reddit.com/r/test',
      title: 'Look at this . More https://example.com',
    })
  })
  it('uses a URL in the title when text has no link', () => {
    expect(
      parseShare(new URLSearchParams({ title: 'https://example.com', text: 'A useful page' })),
    ).toEqual({ url: 'https://example.com/', title: 'A useful page' })
  })
  it.each(['', 'hello', 'Some notes without a link'])('reports a missing URL in %s', (text) => {
    expect(parseShare(new URLSearchParams({ text }))).toEqual({
      error: "That share didn't include a web link.",
    })
  })
  it.each(['javascript:alert(1)', 'data:text/html,hi', 'https://user:pass@example.com'])(
    'rejects unsafe explicit URLs: %s',
    (url) => {
      expect(parseShare(new URLSearchParams({ url }))).toHaveProperty('error')
    },
  )
  it.each(['javascript:alert(1)', 'data:text/html,hi'])(
    'does not extract an unsafe URL from prose: %s',
    (text) => {
      expect(parseShare(new URLSearchParams({ text }))).toHaveProperty('error')
    },
  )
  it('preserves encoded queries without decoding them twice', () => {
    const url = 'https://example.com/?q=a%26b&redirect=https%3A%2F%2Fother.com%2Fx'
    const query = new URLSearchParams({ text: `Watch ${url}`, title: 'Search' }).toString()
    expect(parseShare(new URLSearchParams(query))).toEqual({ url, title: 'Search' })
  })
  it('uses a blank title for a bare URL so saving can supply the fallback', () => {
    expect(parseShare(new URLSearchParams({ text: 'https://example.com/' }))).toEqual({
      url: 'https://example.com/',
      title: '',
    })
  })
  it('caps both supplied and inferred titles at the form limit', () => {
    const examples: Record<string, string>[] = [
      { url: 'example.com', title: 'x'.repeat(500) },
      { text: `${'x'.repeat(5000)} https://example.com` },
    ]
    for (const params of examples) {
      const result = parseShare(new URLSearchParams(params))
      expect('title' in result && result.title.length).toBe(300)
    }
  })
  it('strips prose punctuation while preserving balanced URL parentheses', () => {
    expect(
      parseShare(
        new URLSearchParams({ text: 'See (https://en.wikipedia.org/wiki/Example_(test)).' }),
      ),
    ).toHaveProperty('url', 'https://en.wikipedia.org/wiki/Example_(test)')
  })
  it('validates malformed and oversized URL candidates', () => {
    for (const url of ['https://', `https://example.com/${'x'.repeat(2048)}`]) {
      expect(parseShare(new URLSearchParams({ url }))).toHaveProperty('error')
    }
  })
})

describe('outbound share', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('reports no share support without a navigator share API', () => {
    vi.stubGlobal('navigator', {})
    expect(canShare()).toBe(false)
  })
  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: () => true })
    await expect(shareLink({ title: 'Example', url: 'https://example.com' })).resolves.toBe(true)
    expect(share).toHaveBeenCalledWith({
      title: 'Example',
      text: undefined,
      url: 'https://example.com',
    })
  })
  it('treats dismissing the OS sheet as success', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    vi.stubGlobal('navigator', { share })
    await expect(shareLink({ title: 'Example', url: 'https://example.com' })).resolves.toBe(true)
  })
  it('falls back to the clipboard when sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(shareLink({ title: 'Example', url: 'https://example.com' })).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://example.com')
  })
})
