import { ExternalLink, Pencil, StickyNote } from 'lucide-react'
import { CopyFeedbackIcon } from '../../components/ui/CopyFeedbackIcon'
import { useCopyFeedback } from '../../hooks/useCopyFeedback'
import { useModalTransition } from '../../hooks/useModalTransition'
import { Favicon } from '../../components/ui/Favicon'
import { Button, Modal } from '../../components/ui/primitives'
import { useToast } from '../../components/ui/Toast'
import { formatRelativeTime } from '../../lib/date'
import { domainOf } from '../../lib/url'
import type { SavedLink } from './api'

export function ViewNoteDialog({
  link,
  onClose,
  onEdit,
}: {
  link: SavedLink
  onClose: () => void
  onEdit?: () => void
}) {
  const modal = useModalTransition()
  const { copied, copy } = useCopyFeedback()
  const toast = useToast()
  const domain = domainOf(link.url)
  const relative = formatRelativeTime(link.created_at)

  const copyNote = async () => {
    if (!link.description) return
    const ok = await copy(link.description)
    toast(ok ? 'Note copied to clipboard.' : 'Could not copy note.')
  }

  return (
    <Modal
      open={modal.open}
      afterLeave={modal.afterLeave}
      variant="sheet"
      title="Link Note"
      onClose={() => modal.close(onClose)}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-line bg-canvas/60 p-3">
          <Favicon url={link.url} domain={domain} size={24} />
          <div className="min-w-0 flex-1">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-baseline gap-1.5 text-sm font-semibold hover:text-accent hover:underline"
            >
              <span className="line-clamp-2 [overflow-wrap:anywhere]">{link.title}</span>
              <ExternalLink size={12} className="shrink-0 text-muted" aria-hidden="true" />
            </a>
            <p className="mt-0.5 text-xs text-muted">
              {domain}
              {link.source && ` · ${link.source}`} · {relative}
            </p>
          </div>
        </div>

        <div className="rounded-lg border-l-2 border-accent bg-soft/50 p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-secondary">
            <StickyNote size={14} className="text-accent" aria-hidden="true" />
            Note
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">
            {link.description}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className={`w-full gap-2 sm:w-auto ${copied ? 'text-accent' : ''}`}
            onClick={() => void copyNote()}
            aria-label="Copy note to clipboard"
          >
            <CopyFeedbackIcon copied={copied} />
            Copy note
          </Button>
          {onEdit && (
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 sm:w-auto"
              onClick={() => {
                modal.close(() => {
                  onClose()
                  onEdit()
                })
              }}
              aria-label="Edit this link"
            >
              <Pencil size={16} aria-hidden="true" />
              Edit link
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => modal.close(onClose)}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
