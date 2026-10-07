import { useEffect, useRef, useState, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { Transition } from '@headlessui/react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { LayoutList, Rows3, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, Input, Select } from '../../components/ui/primitives'
import { TagInput } from '../tags/TagInput'
import type { Tag } from './api'
import type { ViewDensity } from './LinkRow'
import type { LinkFilters, Sort } from '../../hooks/useUrlFilters'

function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: LinkFilters
  onChange: (patch: Partial<LinkFilters>) => void
}) {
  const chips = [
    ...filters.tags.map((name) => ({
      key: `tag:${name}`,
      label: name,
      removeLabel: `Remove tag filter ${name}`,
    })),
    ...(filters.source
      ? [
          {
            key: `source:${filters.source}`,
            label: filters.source,
            removeLabel: `Remove source filter ${filters.source}`,
          },
        ]
      : []),
    ...(filters.sort !== 'newest'
      ? [
          {
            key: `sort:${filters.sort}`,
            label: filters.sort === 'oldest' ? 'Oldest' : 'Title A–Z',
            removeLabel: 'Reset sort to newest',
          },
        ]
      : []),
  ]
  // Apply filters immediately while retaining departing chips for their exit.
  const [retained, setRetained] = useState(chips)
  const added = chips.filter((chip) => !retained.some((item) => item.key === chip.key))
  if (added.length) setRetained([...retained, ...added])

  return retained.map((chip) => {
    const present = chips.some((item) => item.key === chip.key)
    return (
      <Transition
        key={chip.key}
        show={present}
        as="div"
        className="filter-chip shrink-0"
        aria-hidden={!present || undefined}
        inert={!present}
        afterLeave={() => setRetained((items) => items.filter((item) => item.key !== chip.key))}
      >
        <div className="min-w-0 overflow-hidden">
          <button
            type="button"
            className="tag gap-2 whitespace-nowrap"
            aria-label={chip.removeLabel}
            onClick={() => {
              if (chip.key.startsWith('tag:'))
                onChange({ tags: filters.tags.filter((tag) => tag !== chip.label) })
              else if (chip.key.startsWith('source:')) onChange({ source: '' })
              else onChange({ sort: 'newest' })
            }}
          >
            <span className="max-w-40 truncate">{chip.label}</span>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </Transition>
    )
  })
}

export function LinkToolbar({
  filters,
  update,
  clear,
  tags,
  sources,
  searchRef,
  density,
  onDensityChange,
}: {
  filters: LinkFilters
  update: (patch: Partial<LinkFilters>, replace?: boolean) => void
  clear: () => void
  tags: Tag[]
  sources: string[]
  searchRef: RefObject<HTMLInputElement | null>
  density: ViewDensity
  onDensityChange: (density: ViewDensity) => void
}) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [draft, setDraft] = useState({
    query: filters.query,
    urlQuery: filters.query,
  })
  const [expanded, setExpanded] = useState(false)
  const desktop = useMediaQuery('(min-width: 40rem)')
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
        className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 border-b border-line bg-canvas py-2.5 sm:static sm:flex-nowrap sm:border-0 sm:bg-transparent sm:py-0"
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
            placeholder="Search links…"
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
        <div
          role="group"
          aria-label="View density"
          className="flex shrink-0 items-center rounded-md border border-line bg-surface"
        >
          <button
            type="button"
            className={`tap rounded-l-md px-2 text-muted hover:bg-soft hover:text-ink ${density === 'detailed' ? 'bg-soft text-ink' : ''}`}
            aria-pressed={density === 'detailed'}
            aria-label="Detailed view"
            title="Detailed view"
            onClick={() => onDensityChange('detailed')}
          >
            <LayoutList size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`tap rounded-r-md border-l border-line px-2 text-muted hover:bg-soft hover:text-ink ${density === 'compact' ? 'bg-soft text-ink' : ''}`}
            aria-pressed={density === 'compact'}
            aria-label="Compact view"
            title="Compact view"
            onClick={() => onDensityChange('compact')}
          >
            <Rows3 size={16} aria-hidden="true" />
          </button>
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
      <Transition
        show={!expanded && active}
        as="div"
        role="group"
        aria-label="Active filters"
        className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 transition-opacity duration-150 data-closed:opacity-0 sm:hidden"
      >
        <ActiveFilterChips filters={filters} onChange={changeFilters} />
        <Button
          variant="ghost"
          className="shrink-0 px-2 text-xs"
          aria-label="Clear filters"
          onClick={clearFilters}
        >
          Clear
        </Button>
      </Transition>
      <div
        id="library-filters"
        className="filter-accordion"
        data-expanded={expanded}
        aria-hidden={(!expanded && !desktop) || undefined}
        inert={!expanded && !desktop}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mb-3 space-y-3 border-b border-line pb-5">
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
        </div>
      </div>
    </>
  )
}
