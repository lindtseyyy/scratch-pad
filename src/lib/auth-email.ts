export const normalizeUsername = (value: string) => value.trim().toLowerCase()
export const isValidUsername = (value: string) => /^[a-z0-9_]{3,30}$/.test(value)
export function usernameToEmail(value: string, domain: string): string {
  const username = normalizeUsername(value)
  if (!isValidUsername(username))
    throw new Error('Use 3–30 lowercase letters, numbers, or underscores.')
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/i.test(domain))
    throw new Error('The internal email domain is not configured correctly.')
  return `${username}@${domain.toLowerCase()}`
}
