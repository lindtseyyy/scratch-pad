export function normalizeTag(value: string): string {
  const name = value.trim().toLowerCase()
  if (!name || name.length > 32) throw new Error('Tags must be 1–32 characters.')
  return name
}

export function parseTagFilters(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .filter(Boolean)
        .map((name) => {
          try {
            return decodeURIComponent(name)
          } catch {
            return name
          }
        }),
    ),
  ]
}
export const serializeTagFilters = (names: string[]) => names.map(encodeURIComponent).join(',')
export const tagLibraryUrl = (name: string) =>
  `/?${new URLSearchParams({ tags: serializeTagFilters([name]) })}`
