import { ExternalLink, Pencil, Share2, Trash2 } from 'lucide-react'
import { CopyFeedbackIcon } from '../../components/ui/CopyFeedbackIcon'
import { useCopyFeedback } from '../../hooks/useCopyFeedback'
import { useModalTransition } from '../../hooks/useModalTransition'
import { Favicon } from '../../components/ui/Favicon'
import { Modal } from '../../components/ui/primitives'
import { useToast } from '../../components/ui/Toast'
import { buzz } from '../../lib/haptics'
import { formatRelativeTime } from '../../lib/date'
import { canShare, shareLink } from '../../lib/share'
import { domainOf } from '../../lib/url'
import type { SavedLink } from './api'

export function LinkActionSheet({
  link,
  onClose,
  onEdit,
  onDelete,
  onTag,
}: {
  link: SavedLink
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onTag: (tag: string) => void
}) {
  const modal = useModalTransition()
  const { copied, copy: copyText } = useCopyFeedback()
  const toast = useToast()
  const domain = domainOf(link.url)
  const relative = formatRelativeTime(link.created_at)
  const fullDate = new Date(link.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const sortedTags = [...link.tags].sort((a, b) => a.name.localeCompare(b.name))

  const copy = async () => {
    const ok = await copyText(link.url)
    toast(ok ? 'Link address copied.' : 'Could not copy this link.')
    if (ok) modal.close(onClose)
  }
  const share = async () => {
    const shared = await shareLink({ title: link.title, url: link.url })
    buzz()
    if (!canShare({ title: link.title, url: link.url })) {
      toast(shared ? 'Link address copied.' : 'Could not share this link.')
    }
    if (shared) modal.close(onClose)
  }

  return (
    <Modal
      open={modal.open}
      afterLeave={modal.afterLeave}
      variant="sheet"
      title="Link actions"
      onClose={() => modal.close(onClose)}
    >
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <Favicon url={link.url} domain={domain} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{link.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {domain}
            {link.source && ` · ${link.source}`} ·{' '}
            <time dateTime={link.created_at} title={fullDate}>
              {relative}
            </time>
          </p>
        </div>
      </div>
      <div role="group" aria-label={`Actions for ${link.title}`} className="flex flex-col gap-1">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="menu-item gap-3 rounded-lg"
        >
          <ExternalLink size={18} className="shrink-0 text-muted" aria-hidden="true" />
          Open in browser
        </a>
        <button
          type="button"
          className={`menu-item gap-3 rounded-lg ${copied ? 'text-accent' : ''}`}
          aria-label="Copy link address"
          onClick={() => void copy()}
        >
          <CopyFeedbackIcon copied={copied} size={18} />
          Copy link address
        </button>
        <button type="button" className="menu-item gap-3 rounded-lg" onClick={() => void share()}>
          <Share2 size={18} className="shrink-0 text-muted" aria-hidden="true" />
          Share link…
        </button>
        <button
          type="button"
          className="menu-item gap-3 rounded-lg"
          onClick={() => {
            modal.close(() => {
              onClose()
              onEdit()
            })
          }}
        >
          <Pencil size={18} className="shrink-0 text-muted" aria-hidden="true" />
          Edit details
        </button>
        <button
          type="button"
          className="menu-item gap-3 rounded-lg text-danger"
          onClick={() => {
            modal.close(() => {
              onClose()
              onDelete()
            })
          }}
        >
          <Trash2 size={18} className="shrink-0" aria-hidden="true" />
          Delete link
        </button>
      </div>
      {sortedTags.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted">Filter by tags</p>
          <div className="flex flex-wrap gap-1.5">
            {sortedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="tag hover:bg-accent-soft hover:text-accent"
                onClick={() => {
                  onTag(tag.name)
                  modal.close(onClose)
                }}
                aria-label={`Filter by ${tag.name}`}
              >
                <span className="min-w-0 break-all">{tag.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-muted" title={link.created_at}>
        Saved {fullDate}
      </p>
    </Modal>
  )
}
