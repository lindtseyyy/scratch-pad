export function authDestination(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/'
  const from = state.from
  if (!from || typeof from !== 'object' || !('pathname' in from)) return '/'
  const pathname = from.pathname
  const search = 'search' in from ? from.search : ''
  if (
    typeof pathname !== 'string' ||
    !/^\/(?!\/)/.test(pathname) ||
    /[\\\s?#]/.test(pathname) ||
    typeof search !== 'string' ||
    (search !== '' && !search.startsWith('?')) ||
    pathname === '/login' ||
    pathname === '/signup'
  )
    return '/'
  return pathname + search
}
