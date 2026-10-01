import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/primitives'
import { LINKS_PER_PAGE } from './api'

export function LinkPagination({
  page,
  count,
  matching,
  hasNextPage,
  busy,
  onPage,
}: {
  page: number
  count: number
  matching: boolean
  hasNextPage: boolean
  busy: boolean
  onPage: (page: number) => void
}) {
  const first = (page - 1) * LINKS_PER_PAGE + 1
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted" role="status">
        Showing {first}–{first + count - 1} {matching ? 'matching' : 'saved'}{' '}
        {count === 1 ? 'link' : 'links'}
        {busy ? ' · Updating…' : ''}
      </p>
      <nav aria-label="Link pagination" className="flex items-center justify-between gap-1.5">
        <Button
          type="button"
          variant="secondary"
          className="gap-1 px-2"
          aria-label="Previous page"
          disabled={page === 1 || busy}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </Button>
        <span aria-current="page" className="px-1 text-sm whitespace-nowrap text-secondary">
          Page {page}
        </span>
        <Button
          type="button"
          variant="secondary"
          className="gap-1 px-2"
          aria-label="Next page"
          disabled={!hasNextPage || busy}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </nav>
    </div>
  )
}
