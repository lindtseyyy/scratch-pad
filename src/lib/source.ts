import { domainOf } from './url'

const sources: [string[], string][] = [
  [['youtube.com', 'youtu.be'], 'YouTube'],
  [['github.com'], 'GitHub'],
  [['reddit.com', 'redd.it'], 'Reddit'],
  [['medium.com'], 'Medium'],
  [['x.com', 'twitter.com'], 'X'],
  [['stackoverflow.com'], 'Stack Overflow'],
  [['news.ycombinator.com'], 'Hacker News'],
  [['dev.to'], 'DEV'],
  [['substack.com'], 'Substack'],
  [['linkedin.com'], 'LinkedIn'],
  [['instagram.com'], 'Instagram'],
  [['tiktok.com'], 'TikTok'],
  [['facebook.com'], 'Facebook'],
  [['vimeo.com'], 'Vimeo'],
  [['wikipedia.org'], 'Wikipedia'],
]

export function detectSource(url: string): string {
  const domain = domainOf(url)
  return (
    sources.find(([hosts]) =>
      hosts.some((host) => domain === host || domain.endsWith(`.${host}`)),
    )?.[1] || domain.slice(0, 60)
  )
}
