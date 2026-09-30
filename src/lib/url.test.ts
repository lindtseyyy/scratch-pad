import { describe, expect, it } from 'vitest'
import { defaultTitle, normalizeUrl } from './url'
import { detectSource } from './source'
import { isStrongPassword } from './password-rules'
import { usernameToEmail } from './auth-email'
import { normalizeTag, parseTagFilters, serializeTagFilters } from './tags'

describe('URL normalization and safe navigation', () => {
  it('adds https and normalizes hostnames', () =>
    expect(normalizeUrl(' Example.COM/article ')).toBe('https://example.com/article'))
  it('allows local ports and protocol-relative addresses', () => {
    expect(normalizeUrl('localhost:5173')).toBe('https://localhost:5173/')
    expect(normalizeUrl('//example.com')).toBe('https://example.com/')
  })
  it.each([
    'javascript:alert(1)',
    'data:text/html,hi',
    'ftp://example.com',
    'not a url',
    '/article',
    'hello',
    'https://user:pass@example.com',
  ])('rejects %s', (input) => expect(() => normalizeUrl(input)).toThrow())
  it('enforces the final URL length', () =>
    expect(() => normalizeUrl(`example.com/${'a'.repeat(2048)}`)).toThrow())
  it('creates readable fallback titles', () => {
    expect(defaultTitle('https://example.com/blog/how-rls-works')).toBe('How rls works')
    expect(defaultTitle('https://www.example.com/')).toBe('example.com')
    expect(defaultTitle('https://example.com/read/hello%20world.html')).toBe('Hello world')
  })
})
describe('source detection', () => {
  it.each([
    ['https://m.youtube.com/watch?v=1', 'YouTube'],
    ['https://youtu.be/1', 'YouTube'],
    ['https://gist.github.com/a', 'GitHub'],
    ['https://writer.substack.com/p/a', 'Substack'],
    ['https://en.wikipedia.org/wiki/A', 'Wikipedia'],
    ['https://youtube.com.evil.org', 'youtube.com.evil.org'],
    ['https://example.com', 'example.com'],
  ])('detects %s', (url, source) => expect(detectSource(url)).toBe(source))
})
describe('account and tag validation', () => {
  it('requires every password class', () => {
    expect(isStrongPassword('MyStrongPass12!')).toBe(true)
    for (const weak of [
      'short1A!',
      'alllowercase12!',
      'ALLUPPERCASE12!',
      'NoNumbersHere!',
      'NoSymbolsHere12',
      'WhitespaceOnly12 ',
    ])
      expect(isStrongPassword(weak)).toBe(false)
  })
  it('maps normalized usernames deterministically', () =>
    expect(usernameToEmail(' Alice_1 ', 'users.scratch-pad.test')).toBe(
      'alice_1@users.scratch-pad.test',
    ))
  it('rejects usernames and domains that can change the mapping', () => {
    expect(() => usernameToEmail('a@b', 'users.test')).toThrow()
    expect(() => usernameToEmail('alice', 'users.test/path')).toThrow()
  })
  it('normalizes tags and enforces their limit', () => {
    expect(normalizeTag(' React ')).toBe('react')
    expect(() => normalizeTag('x'.repeat(33))).toThrow()
  })
  it('round trips punctuation in tag filter URLs', () => {
    const names = ['react', 'a,b', '100%', 'hello world']
    const params = new URLSearchParams({ tags: serializeTagFilters(names) })
    expect(parseTagFilters(new URLSearchParams(params.toString()).get('tags')!)).toEqual(names)
    expect(parseTagFilters('react,video,react')).toEqual(['react', 'video'])
  })
})
