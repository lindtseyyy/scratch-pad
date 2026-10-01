export function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(
      error.message,
    )
  )
    return "You're offline. Connect and try again."
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
    return 'That name is already in use. Choose another.'
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    return error.message
  return 'Something went wrong. Please try again.'
}
