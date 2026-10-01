import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { normalizeUrl } from '../../lib/url'
import { errorMessage } from '../../lib/errors'
import type { SharedLink } from '../../lib/share'
import { useToast } from '../../components/ui/Toast'
import { Button, EmptyState, InlineError, Input, Spinner } from '../../components/ui/primitives'
import { useTags } from '../tags/hooks'
import { useLinkCount, useLinks, useSources } from './hooks'
import { LinkToolbar } from './LinkToolbar'
import { LinkRow } from './LinkRow'
import { LinkPagination } from './LinkPagination'
import { LinkFormDialog } from './LinkFormDialog'
import { DeleteLinkDialog } from './DeleteLinkDialog'
import type { SavedLink } from './api'

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      'input,textarea,select,[contenteditable="true"],[role="combobox"],[role="listbox"],[role="option"],[aria-haspopup="listbox"]',
    )
  )
}
export function LibraryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const handledEntry = useRef<string | null>(null)
  const { filters, page, setPage, update, clear } = useUrlFilters()
  const links = useLinks(filters, page)
  const tags = useTags()
  const sources = useSources()
  const total = useLinkCount()
  const [quickUrl, setQuickUrl] = useState('')
  const [quickError, setQuickError] = useState('')
  const [form, setForm] = useState<{
    url?: string
    title?: string
    link?: SavedLink
    entry?: string
  } | null>(() => {
    const share = (location.state as { share?: SharedLink } | null)?.share
    if (share && 'url' in share) return { url: share.url, title: share.title, entry: location.key }
    return new URLSearchParams(location.search).get('add') === '1' ? {} : null
  })
  const [deleting, setDeleting] = useState<SavedLink | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const quickRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const focusPage = useRef(false)
  useEffect(() => {
    if (links.data?.rows.length === 0 && page > 1) {
      setPage(1, true)
    } else if (links.data && focusPage.current) {
      focusPage.current = false
      listRef.current?.scrollIntoView({ block: 'start' })
      listRef.current?.focus({ preventScroll: true })
    }
  }, [links.data, page, setPage])
  useEffect(() => {
    const share = (location.state as { share?: SharedLink } | null)?.share
    const params = new URLSearchParams(location.search)
    const add = params.get('add') === '1'
    if ((!share && !add) || handledEntry.current === location.key) return
    handledEntry.current = location.key
    if (share && 'error' in share) toast(share.error)
    if (add) params.delete('add')
    const search = params.toString()
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash },
      { replace: true, state: null },
    )
  }, [location, navigate, toast])
  useEffect(() => {
    if (form || deleting) return
    const keydown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setForm({})
      }
    }
    const paste = (event: ClipboardEvent) => {
      if (isTyping(event.target)) return
      try {
        const url = normalizeUrl(event.clipboardData?.getData('text') || '')
        event.preventDefault()
        setForm({ url })
      } catch {
        /* Non-URL clipboard content is left alone. */
      }
    }
    document.addEventListener('keydown', keydown)
    document.addEventListener('paste', paste)
    return () => {
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('paste', paste)
    }
  }, [form, deleting])
  const add = (event: FormEvent) => {
    event.preventDefault()
    setQuickError('')
    try {
      setForm({ url: normalizeUrl(quickUrl) })
      setQuickUrl('')
    } catch (error) {
      setQuickError(errorMessage(error))
    }
  }
  const rows = links.data?.rows || []
  const active = !!filters.query || !!filters.tags.length || !!filters.source
  const error = tags.error || links.error
  return (
    <main id="main" className="page lg:max-w-[1168px]">
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside
          aria-label="Tag filters"
          className="sticky top-8 hidden max-h-[calc(100dvh-4rem)] min-h-40 overflow-y-auto rounded-lg border border-line bg-surface p-3 lg:block"
        >
          <h2 className="mb-3 px-3 text-sm font-semibold">Tags</h2>
          {tags.data?.length ? (
            <div className="space-y-1">
              {tags.data.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={filters.tags.includes(tag.name)}
                  aria-label={`${tag.name}, ${tag.link_count} ${tag.link_count === 1 ? 'link' : 'links'}`}
                  className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm touch:min-h-11 ${filters.tags.includes(tag.name) ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-soft'}`}
                  onClick={() =>
                    update({
                      tags: filters.tags.includes(tag.name)
                        ? filters.tags.filter((name) => name !== tag.name)
                        : [...filters.tags, tag.name],
                    })
                  }
                >
                  <span className="min-w-0 break-all">{tag.name}</span>
                  <span className="shrink-0 text-xs text-muted">{tag.link_count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 text-xs text-muted">
              {tags.isPending
                ? 'Loading tags…'
                : tags.isError
                  ? 'Tags couldn’t load.'
                  : 'Your tags will appear here.'}
            </p>
          )}
        </aside>
        <div className="min-w-0 rounded-lg border border-line bg-surface p-3 sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-3 sm:mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
              <p className="mt-1 hidden text-sm text-muted sm:block">
                Good finds. All in one place.
              </p>
            </div>
            <div className="pt-1.5 text-xs text-muted">
              {total.data !== undefined &&
                `${total.data} saved ${total.data === 1 ? 'link' : 'links'}`}
            </div>
          </div>
          <form className="mb-2 flex gap-2 sm:mb-6" onSubmit={add}>
            <label htmlFor="quick-url" className="sr-only">
              URL to save
            </label>
            <Input
              id="quick-url"
              ref={quickRef}
              className="min-w-0 flex-1"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Paste a link to save…"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <Button type="submit" disabled={!quickUrl.trim()}>
              <Plus size={16} aria-hidden="true" />
              Save
            </Button>
          </form>
          {quickError && <InlineError>{quickError}</InlineError>}
          <LinkToolbar
            filters={filters}
            update={update}
            clear={clear}
            tags={tags.data || []}
            sources={sources.data || []}
            searchRef={searchRef}
          />
          {sources.isError && (
            <p role="alert" className="mb-3 text-xs text-danger">
              Source filters couldn’t load.{' '}
              <button className="tap underline" onClick={() => void sources.refetch()}>
                Retry
              </button>
            </p>
          )}
          {error ? (
            <div className="py-6">
              <InlineError>{errorMessage(error)}</InlineError>
              <Button
                className="mt-3"
                variant="secondary"
                onClick={() => {
                  void tags.refetch()
                  void links.refetch()
                }}
              >
                Try again
              </Button>
            </div>
          ) : links.isPending || (page > 1 && rows.length === 0) ? (
            <Spinner label="Loading your links…" />
          ) : rows.length === 0 ? (
            <EmptyState
              title={active ? 'No links match just yet.' : 'Your next good find starts here.'}
              description={
                active
                  ? 'Try a different search or remove a filter to see more.'
                  : 'Paste your first link above. Add a tag or a note, and make it easy to find later.'
              }
            >
              <Button
                variant="secondary"
                onClick={active ? clear : () => quickRef.current?.focus()}
              >
                {active ? 'Clear filters' : 'Paste your first link'}
              </Button>
            </EmptyState>
          ) : (
            <>
              <div
                ref={listRef}
                role="region"
                aria-label={`Saved links, page ${page}`}
                aria-busy={links.isFetching}
                tabIndex={-1}
                className="scroll-mt-20 space-y-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:scroll-mt-4"
              >
                {rows.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    onEdit={() => setForm({ link })}
                    onDelete={() => setDeleting(link)}
                    onTag={(tag) => update({ tags: [...new Set([...filters.tags, tag])] })}
                  />
                ))}
              </div>
              <LinkPagination
                page={page}
                count={rows.length}
                matching={active}
                hasNextPage={links.data?.hasNextPage || false}
                busy={links.isFetching}
                onPage={(next) => {
                  focusPage.current = true
                  setPage(next)
                }}
              />
            </>
          )}
          {form && (
            <LinkFormDialog
              key={form.entry || form.link?.id || form.url || 'new'}
              link={form.link}
              initialUrl={form.url}
              initialTitle={form.title}
              onClose={() => setForm(null)}
              onEditDuplicate={(link) => setForm({ link })}
            />
          )}
          {deleting && <DeleteLinkDialog link={deleting} onClose={() => setDeleting(null)} />}
        </div>
      </div>
    </main>
  )
}
