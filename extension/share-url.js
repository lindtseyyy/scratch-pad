export const APP_URL = 'https://scratch-pad-omega.vercel.app'

/** Returns the URL to open for a page, link, or text selection. */
export function shareUrl({ url = '', title = '', text = '' }, app = APP_URL) {
  const webUrl = /^https?:\/\//i.test(url)
  if (!webUrl && !text) return `${app}/?add=1&popup=1`
  const params = new URLSearchParams()
  if (webUrl) params.set('url', url)
  if (title) params.set('title', title)
  if (text) params.set('text', text)
  params.set('popup', '1')
  return `${app}/share?${params}`
}
