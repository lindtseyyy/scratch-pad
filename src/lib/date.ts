export function formatRelativeTime(dateString: string, now: Date = new Date()): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) return 'Just now'
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diffMs < minute) return 'Just now'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
