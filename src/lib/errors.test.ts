import { expect, it } from 'vitest'
import { errorMessage } from './errors'

it.each([
  'Failed to fetch',
  'fetch failed',
  'NetworkError when attempting to fetch resource.',
  'Network request failed',
  'Load failed',
])('explains an offline fetch failure: %s', (message) => {
  expect(errorMessage(new Error(message))).toBe("You're offline. Connect and try again.")
})

it('retains server and validation error messages', () => {
  expect(errorMessage({ code: '23505', message: 'duplicate key' })).toBe(
    'That name is already in use. Choose another.',
  )
  expect(errorMessage(new Error('Invalid login credentials'))).toBe('Invalid login credentials')
})
