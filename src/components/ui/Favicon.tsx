import { useState } from 'react'
import { Globe } from 'lucide-react'
import { domainOf } from '../../lib/url'

const PASTELS = [
  ['#e8eee6', '#386349'],
  ['#e6edf3', '#2f4a63'],
  ['#f0e9e0', '#6b4f2a'],
  ['#e9e6f0', '#4e3f6b'],
  ['#e3efee', '#2f5d5a'],
  ['#f3e4e4', '#7a3b3b'],
] as const

function pastelFor(domain: string): readonly [string, string] {
  let hash = 0
  for (let i = 0; i < domain.length; i++) hash = (hash * 31 + domain.charCodeAt(i)) >>> 0
  return PASTELS[hash % PASTELS.length]
}

export function Favicon({
  url,
  domain,
  size = 20,
  className = '',
}: {
  url: string
  domain?: string
  size?: number
  className?: string
}) {
  const host = domain || domainOf(url)
  const [stage, setStage] = useState(0)
  const box = `flex shrink-0 items-center justify-center overflow-hidden rounded-md ${className}`
  const style = { width: size, height: size }

  if (!host) {
    return (
      <span className={`${box} bg-soft text-muted`} style={style} aria-hidden="true">
        <Globe size={Math.max(12, size - 8)} />
      </span>
    )
  }

  if (stage >= 2) {
    const [background, color] = pastelFor(host.toLowerCase())
    return (
      <span
        className={`${box} text-xs font-semibold`}
        style={{ ...style, background, color }}
        aria-hidden="true"
      >
        {host.charAt(0).toUpperCase()}
      </span>
    )
  }

  const src =
    stage === 0
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
      : `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`
  return (
    <img
      key={src}
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setStage((current) => current + 1)}
      className={`shrink-0 rounded-md bg-soft object-contain ${className}`}
      style={style}
    />
  )
}
