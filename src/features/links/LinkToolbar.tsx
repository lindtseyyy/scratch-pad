import { useEffect, useRef, useState, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
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
  return (
    <div className="mb-3 space-y-3 border-b border-line pb-5">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-3 text-muted"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            aria-label="Search links"
            placeholder="Search your links…"
            className="pl-9"
            value={draft.urlQuery === filters.query ? draft.query : filters.query}
            onChange={(event) => {
              const query = event.target.value
              setDraft({ query, urlQuery: filters.query })
              clearTimeout(timer.current)
              timer.current = setTimeout(() => latestUpdate.current({ query }, true), 250)
            }}
          />
          <kbd className="pointer-events-none absolute right-3 top-2.5 hidden rounded border border-line px-1.5 text-xs text-muted sm:block">
            /
          </kbd>
        </div>
        <Button
          variant="secondary"
          className="sm:hidden"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="library-filters"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          {(filters.tags.length > 0 || filters.source) && (
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          )}
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          <label htmlFor="desktop-source" className="sr-only">
            Source
          </label>
          <Select
            id="desktop-source"
            className="w-40"
            value={filters.source}
            onChange={(e) => update({ source: e.target.value })}
          >
            <option value="">All sources</option>
            {[...new Set([...sources, ...(filters.source ? [filters.source] : [])])].map(
              (source) => (
                <option key={source}>{source}</option>
              ),
            )}
          </Select>
          <label htmlFor="desktop-sort" className="sr-only">
            Sort links
          </label>
          <Select
            id="desktop-sort"
            className="w-32"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as Sort })}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
      </div>
      <div id="library-filters" className={`${expanded ? 'block' : 'hidden'} space-y-3 sm:block`}>
        <div className="flex gap-2 sm:hidden">
          <div className="min-w-0 flex-1">
            <label htmlFor="mobile-source" className="mb-1 block text-xs text-muted">
              Source
            </label>
            <Select
              id="mobile-source"
              value={filters.source}
              onChange={(e) => update({ source: e.target.value })}
            >
              <option value="">All sources</option>
              {[...new Set([...sources, ...(filters.source ? [filters.source] : [])])].map(
                (source) => (
                  <option key={source}>{source}</option>
                ),
              )}
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="mobile-sort" className="mb-1 block text-xs text-muted">
              Sort links
            </label>
            <Select
              id="mobile-sort"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as Sort })}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title A–Z</option>
            </Select>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="filter-tags" className="sr-only">
              Filter by tags
            </label>
            <TagInput
              id="filter-tags"
              value={filters.tags}
              onChange={(tags) => update({ tags })}
              suggestions={tags.map((tag) => tag.name)}
              allowCreate={false}
            />
          </div>
          {active && (
            <Button
              variant="ghost"
              onClick={() => {
                clearTimeout(timer.current)
                setDraft({ query: '', urlQuery: '' })
                clear()
              }}
              className="mt-2 whitespace-nowrap px-1 text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
