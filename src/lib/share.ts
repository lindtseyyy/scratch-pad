import { LINK_TITLE_MAX_LENGTH, normalizeUrl } from './url'
import { copyToClipboard } from './clipboard'

export type SharedLink = { url: string; title: string } | { error: string }
export type OutboundShare = { title: string; url: string; text?: string }

export function canShare(payload?: OutboundShare): boolean {
  if (typeof navigator === 'undefined' || !('share' in navigator)) return false
  if (!payload || typeof navigator.canShare !== 'function') return true
  try {
    return navigator.canShare({ title: payload.title, text: payload.text, url: payload.url })
  } catch {
    return true
  }
}

export async function shareLink({ title, url, text }: OutboundShare): Promise<boolean> {
  if (canShare({ title, url, text })) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch (error) {
      // Dismissing the OS sheet is not a failure; anything else falls back to copy.
      if (error instanceof DOMException && error.name === 'AbortError') return true
    }
  }
  return copyToClipboard(url)
}

function proseUrl(text: string): string {
  let url = text.match(/https?:\/\/[^\s<>"']+/i)?.[0] || ''
  // Keep balanced delimiters in real URLs (for example Wikipedia article names).
  while (url) {
    if (/[.,!?:;]$/.test(url)) url = url.slice(0, -1)
    else {
      const closing = url.at(-1)!
      const opening = { ')': '(', ']': '[', '}': '{' }[closing]
      if (!opening || url.split(closing).length <= url.split(opening).length) break
      url = url.slice(0, -1)
    }
  }
  return url
}

export function parseShare(params: URLSearchParams): SharedLink {
  const text = (params.get('text') || '').trim()
  const suppliedTitle = (params.get('title') || '').trim()
  const candidate = (params.get('url') || '').trim() || proseUrl(text) || proseUrl(suppliedTitle)
  if (!candidate) return { error: "That share didn't include a web link." }
  let url: string
  try {
    url = normalizeUrl(candidate)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'That web link could not be opened.' }
  }
  let titleIsUrl = false
  try {
    titleIsUrl = normalizeUrl(suppliedTitle) === url
  } catch {
    // Prose titles aren't URLs.
  }
  const title =
    suppliedTitle && !titleIsUrl
      ? suppliedTitle
      : text.replace(candidate, '').replace(url, '').trim()
  return { url, title: title.slice(0, LINK_TITLE_MAX_LENGTH) }
}
