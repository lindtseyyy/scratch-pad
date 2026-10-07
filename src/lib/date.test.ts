import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './date'

const now = new Date('2026-10-06T12:00:00.000Z')

describe('formatRelativeTime', () => {
  it('says Just now within the first minute', () => {
    expect(formatRelativeTime('2026-10-06T11:59:30.000Z', now)).toBe('Just now')
    expect(formatRelativeTime('2026-10-06T12:00:00.000Z', now)).toBe('Just now')
  })
  it('treats future timestamps as Just now', () => {
    expect(formatRelativeTime('2026-10-06T12:05:00.000Z', now)).toBe('Just now')
  })
  it('formats minutes and hours ago', () => {
    expect(formatRelativeTime('2026-10-06T11:30:00.000Z', now)).toBe('30m ago')
    expect(formatRelativeTime('2026-10-06T10:00:00.000Z', now)).toBe('2h ago')
    expect(formatRelativeTime('2026-10-05T13:00:00.000Z', now)).toBe('23h ago')
  })
  it('formats days ago within the first week', () => {
    expect(formatRelativeTime('2026-10-05T12:00:00.000Z', now)).toBe('1d ago')
    expect(formatRelativeTime('2026-09-30T12:00:00.000Z', now)).toBe('6d ago')
  })
  it('formats older dates without the year when current', () => {
    const expected = new Date('2026-09-20T12:00:00.000Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    expect(formatRelativeTime('2026-09-20T12:00:00.000Z', now)).toBe(expected)
  })
  it('includes the year for previous years', () => {
    const expected = new Date('2025-10-04T12:00:00.000Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    expect(formatRelativeTime('2025-10-04T12:00:00.000Z', now)).toBe(expected)
  })
  it('returns empty string for invalid dates', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('')
  })
})
