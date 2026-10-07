import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from './clipboard'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('copyToClipboard', () => {
  it('returns false for empty text', async () => {
    await expect(copyToClipboard('')).resolves.toBe(false)
  })
  it('writes via the Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyToClipboard('https://example.com')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://example.com')
  })
  it('returns false when no clipboard mechanism exists', async () => {
    vi.stubGlobal('navigator', {})
    await expect(copyToClipboard('https://example.com')).resolves.toBe(false)
  })
})
