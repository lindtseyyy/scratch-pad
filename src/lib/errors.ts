export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
    return 'That name is already in use. Choose another.'
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    return error.message
  return 'Something went wrong. Please try again.'
}
