import { describe, expect, it } from 'vitest'
import { authDestination } from './auth-redirect'

describe('login destinations', () => {
  it('retains a shared URL and title across authentication', () => {
    const search = '?url=https%3A%2F%2Fexample.com&title=Shared'
    expect(authDestination({ from: { pathname: '/share', search } })).toBe(`/share${search}`)
  })
  it('retains library shortcut and filter parameters', () => {
    expect(authDestination({ from: { pathname: '/', search: '?add=1&q=react' } })).toBe(
      '/?add=1&q=react',
    )
  })
  it.each([
    null,
    {},
    { from: '/share' },
    { from: { pathname: 'https://other.com' } },
    { from: { pathname: '//other.com' } },
    { from: { pathname: '/\\other.com' } },
    { from: { pathname: '/login' } },
    { from: { pathname: '/signup' } },
    { from: { pathname: '/', search: '//other.com' } },
  ])('falls back for malformed or external destinations: %j', (state) => {
    expect(authDestination(state)).toBe('/')
  })
})
