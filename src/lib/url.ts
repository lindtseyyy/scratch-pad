export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed || /\s/.test(trimmed)) throw new Error('Enter a valid web address without spaces.')
  const hostWithPort = /^[^/:]+:\d+(?:[/?#]|$)/.test(trimmed)
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !hostWithPort && !/^https?:\/\//i.test(trimmed)) {
    throw new Error('Only http:// and https:// links can be saved.')
  }
  let url: URL
  try {
    url = new URL(
      trimmed.startsWith('//')
        ? `https:${trimmed}`
        : /^https?:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`,
    )
  } catch {
    throw new Error('Enter a valid web address, such as example.com/article.')
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    (!url.hostname.includes('.') && !url.hostname.includes(':') && url.hostname !== 'localhost')
  ) {
    throw new Error('Enter a valid web address, such as example.com/article.')
  }
  if (url.username || url.password)
    throw new Error('Links containing usernames or passwords cannot be saved.')
  if (url.href.length > 2048) throw new Error('The URL must be 2,048 characters or fewer.')
  return url.href
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^(www\.|m\.|mobile\.)/i, '')
  } catch {
    return ''
  }
}

export function defaultTitle(url: string): string {
  const parsed = new URL(url)
  const segments = parsed.pathname
    .split('/')
    .filter((segment) => segment && !/^index\.[a-z]+$|^\d+$/i.test(segment))
  let segment = segments.at(-1) || ''
  try {
    segment = decodeURIComponent(segment)
  } catch {
    /* Retain malformed percent sequences as text. */
  }
  const title = segment
    .replace(/\.(html?|md|php)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  return title ? (title[0].toUpperCase() + title.slice(1)).slice(0, 300) : domainOf(parsed.href)
}
