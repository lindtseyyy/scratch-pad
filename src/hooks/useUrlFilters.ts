import { useSearchParams } from 'react-router-dom'
import { parseTagFilters, serializeTagFilters } from '../lib/tags'
export type Sort = 'newest' | 'oldest' | 'title'
export type LinkFilters = { query: string; tags: string[]; source: string; sort: Sort }
export function useUrlFilters() {
  const [params, setParams] = useSearchParams()
  const sort = params.get('sort')
  const filters: LinkFilters = {
    query: params.get('q') || '',
    tags: parseTagFilters(params.get('tags') || ''),
    source: params.get('source') || '',
    sort: sort === 'oldest' || sort === 'title' ? sort : 'newest',
  }
  const pageParam = params.get('page') || '1'
  const pageNumber = Number(pageParam)
  const page =
    /^\d+$/.test(pageParam) &&
    Number.isSafeInteger(pageNumber) &&
    pageNumber > 0 &&
    pageNumber <= 100_000_000
      ? pageNumber
      : 1
  const setPage = (value: number, replace = false) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value > 1) next.set('page', String(value))
        else next.delete('page')
        return next
      },
      { replace },
    )
  }
  const update = (patch: Partial<LinkFilters>, replace = false) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('page')
        if (patch.query !== undefined) {
          if (patch.query) next.set('q', patch.query)
          else next.delete('q')
        }
        if (patch.tags !== undefined) {
          if (patch.tags.length) next.set('tags', serializeTagFilters(patch.tags))
          else next.delete('tags')
        }
        if (patch.source !== undefined) {
          if (patch.source) next.set('source', patch.source)
          else next.delete('source')
        }
        if (patch.sort !== undefined) {
          if (patch.sort !== 'newest') next.set('sort', patch.sort)
          else next.delete('sort')
        }
        return next
      },
      { replace },
    )
  }
  return {
    filters,
    page,
    setPage,
    update,
    clear: () => setParams({}, { state: { filtersCleared: true } }),
  }
}
