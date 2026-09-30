import { useEffect, useRef, useState, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, Input, Select } from '../../components/ui/primitives'
import { TagInput } from '../tags/TagInput'
import type { Tag } from './api'
import type { LinkFilters, Sort } from '../../hooks/useUrlFilters'
export function LinkToolbar({
  filters,
  update,
  clear,
  tags,
  sources,
  searchRef,
}: {
  filters: LinkFilters
  update: (patch: Partial<LinkFilters>, replace?: boolean) => void
  clear: () => void
  tags: Tag[]
  sources: string[]
  searchRef: RefObject<HTMLInputElement | null>
}) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [draft, setDraft] = useState({
    query: filters.query,
    urlQuery: filters.query,
  })
  const [expanded, setExpanded] = useState(false)
  const [observedLocation, setObservedLocation] = useState(location)
  if (observedLocation.key !== location.key) {
    setObservedLocation(location)
    const previousQuery = new URLSearchParams(observedLocation.search).get('q') || ''
    if (
      navigationType === 'POP' ||
      location.state?.filtersCleared ||
      previousQuery !== filters.query
    ) {
      setDraft({ query: filters.query, urlQuery: filters.query })
    }
  }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latestUpdate = useRef(update)
  useEffect(() => {
    latestUpdate.current = update
  }, [update])
  useEffect(() => () => clearTimeout(timer.current), [filters.query])
  useEffect(() => {
    if (navigationType === 'POP' || location.state?.filtersCleared) {
      clearTimeout(timer.current)
    }
  }, [location.key, location.state, navigationType])
  const active =
    !!filters.query || !!filters.tags.length || !!filters.source || filters.sort !== 'newest'
  const filterCount =
    filters.tags.length + Number(!!filters.source) + Number(filters.sort !== 'newest')
  const sourceOptions = [
    { value: '', label: 'All sources' },
    ...[...new Set([...sources, ...(filters.source ? [filters.source] : [])])].map((source) => ({
      value: source,
      label: source,
    })),
  ]
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'title', label: 'Title A–Z' },
  ]
  const changeFilters = (patch: Partial<LinkFilters>) => {
    clearTimeout(timer.current)
    // Commit the pending search together with the choice so neither URL update
    // can overwrite the other when a dropdown is used before the debounce ends.
    update({ query: draft.urlQuery === filters.query ? draft.query : filters.query, ...patch })
  }
  const clearFilters = () => {
    clearTimeout(timer.current)
    setDraft({ query: '', urlQuery: '' })
    clear()
  }
  return (
    <>
      <div
        data-search-row
        className="sticky top-0 z-10 mb-3 flex gap-2 border-b border-line bg-surface py-3 sm:static sm:flex-wrap sm:border-0 sm:py-0"
      >
        <div className="relative min-w-0 flex-1 sm:min-w-48">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-3 text-muted"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            aria-label="Search links"
            placeholder="Search your links…"
            className="pl-9 fine:pr-9"
            value={draft.urlQuery === filters.query ? draft.query : filters.query}
            onChange={(event) => {
              const query = event.target.value
              setDraft({ query, urlQuery: filters.query })
              clearTimeout(timer.current)
              timer.current = setTimeout(() => latestUpdate.current({ query }, true), 250)
            }}
          />
          <kbd className="pointer-events-none absolute right-3 top-2.5 hidden rounded border border-line px-1.5 text-xs text-muted fine:block">
            /
          </kbd>
        </div>
        <Button
          variant="secondary"
          className="shrink-0 gap-1.5 sm:hidden"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="library-filters"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters{filterCount > 0 ? ` · ${filterCount}` : ''}
        </Button>
        <div className="hidden min-w-0 flex-wrap items-center gap-2 sm:flex">
          <label id="desktop-source-label" htmlFor="desktop-source" className="sr-only">
            Source
          </label>
          <Select
            id="desktop-source"
            className="w-40 max-w-full"
            value={filters.source}
            onChange={(source) => changeFilters({ source })}
            options={sourceOptions}
          />
          <label id="desktop-sort-label" htmlFor="desktop-sort" className="sr-only">
            Sort links
          </label>
          <Select
            id="desktop-sort"
            className="w-32 max-w-full"
            value={filters.sort}
            onChange={(sort) => changeFilters({ sort: sort as Sort })}
            options={sortOptions}
          />
        </div>
      </div>
      {!expanded && active && (
        <div
          role="group"
          aria-label="Active filters"
          className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 sm:hidden"
        >
          {filters.tags.map((name) => (
            <button
              key={name}
              type="button"
              className="tag shrink-0 gap-2"
              aria-label={`Remove tag filter ${name}`}
              onClick={() => changeFilters({ tags: filters.tags.filter((tag) => tag !== name) })}
            >
              <span className="max-w-40 truncate">{name}</span>
              <X size={14} aria-hidden="true" />
            </button>
          ))}
          {filters.source && (
            <button
              type="button"
              className="tag shrink-0 gap-2"
              aria-label={`Remove source filter ${filters.source}`}
              onClick={() => changeFilters({ source: '' })}
            >
              <span className="max-w-40 truncate">{filters.source}</span>
              <X size={14} aria-hidden="true" />
            </button>
          )}
          {filters.sort !== 'newest' && (
            <button
              type="button"
              className="tag shrink-0 gap-2"
              aria-label="Reset sort to newest"
              onClick={() => changeFilters({ sort: 'newest' })}
            >
              {filters.sort === 'oldest' ? 'Oldest' : 'Title A–Z'}
              <X size={14} aria-hidden="true" />
            </button>
          )}
          <Button
            variant="ghost"
            className="shrink-0 px-2 text-xs"
            aria-label="Clear filters"
            onClick={clearFilters}
          >
            Clear
          </Button>
        </div>
      )}
      <div
        id="library-filters"
        className={`${expanded ? 'block' : 'hidden'} mb-3 space-y-3 border-b border-line pb-5 sm:block`}
      >
        <div className="flex gap-2 sm:hidden">
          <div className="min-w-0 flex-1">
            <label
              id="mobile-source-label"
              htmlFor="mobile-source"
              className="mb-1 block text-xs text-muted"
            >
              Source
            </label>
            <Select
              id="mobile-source"
              value={filters.source}
              onChange={(source) => changeFilters({ source })}
              options={sourceOptions}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label
              id="mobile-sort-label"
              htmlFor="mobile-sort"
              className="mb-1 block text-xs text-muted"
            >
              Sort links
            </label>
            <Select
              id="mobile-sort"
              value={filters.sort}
              onChange={(sort) => changeFilters({ sort: sort as Sort })}
              options={sortOptions}
            />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="filter-tags" className="sr-only">
              Filter by tags
            </label>
            <TagInput
              id="filter-tags"
              value={filters.tags}
              onChange={(tags) => changeFilters({ tags })}
              suggestions={tags.map((tag) => tag.name)}
              allowCreate={false}
            />
          </div>
          {active && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="shrink-0 whitespace-nowrap px-1 text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
