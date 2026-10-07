import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ExternalLink, MoreHorizontal, Pencil, Share2, StickyNote, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Favicon } from '../../components/ui/Favicon'
import { CopyFeedbackIcon } from '../../components/ui/CopyFeedbackIcon'
import { useToast } from '../../components/ui/Toast'
import { useCopyFeedback } from '../../hooks/useCopyFeedback'
import { buzz } from '../../lib/haptics'
import { formatRelativeTime } from '../../lib/date'
import { canShare, shareLink } from '../../lib/share'
import { domainOf } from '../../lib/url'
import type { SavedLink } from './api'
import { LinkActionSheet } from './LinkActionSheet'
import { ViewNoteDialog } from './ViewNoteDialog'

export type ViewDensity = 'detailed' | 'compact'

const NOTE_PREVIEW_LIMIT = 100

export function LinkRow({
  link,
  onEdit,
  onDelete,
  onTag,
  density = 'detailed',
}: {
  link: SavedLink
  onEdit: () => void
  onDelete: () => void
  onTag: (tag: string) => void
  density?: ViewDensity
}) {
  const { copied, copy: copyText } = useCopyFeedback()
  const toast = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
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
  const noteExpandable = (link.description?.length || 0) > NOTE_PREVIEW_LIMIT

  const copy = async () => {
    const ok = await copyText(link.url)
    toast(ok ? 'Link address copied.' : 'Could not copy this link.')
  }
  const share = async () => {
    const ok = await shareLink({ title: link.title, url: link.url })
    buzz()
    if (!canShare({ title: link.title, url: link.url })) {
      toast(ok ? 'Link address copied.' : 'Could not share this link.')
    }
  }
  const clearPress = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }
  const pressProps = {
    onTouchStart: () => {
      longPressed.current = false
      clearPress()
      pressTimer.current = setTimeout(() => {
        longPressed.current = true
        buzz()
        setSheetOpen(true)
      }, 550)
    },
    onTouchMove: clearPress,
    onTouchEnd: clearPress,
    onTouchCancel: clearPress,
    onContextMenu: (event: React.MouseEvent) => {
      if (longPressed.current) {
        event.preventDefault()
        longPressed.current = false
      }
    },
  }
  const sheetTrigger = (
    <div className="shrink-0 sm:hidden">
      <button
        type="button"
        className="rounded p-2.5 text-muted hover:bg-soft hover:text-ink touch:min-h-11 touch:min-w-11 touch:p-3"
        aria-label={`Actions for ${link.title}`}
        onClick={() => setSheetOpen(true)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
    </div>
  )
  const desktopMenu = (
    <div className="hidden shrink-0 sm:block">
      <Menu>
        <MenuButton
          className="rounded p-2.5 text-muted hover:bg-soft hover:text-ink touch:min-h-11 touch:min-w-11"
          aria-label={`Actions for ${link.title}`}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </MenuButton>
        <MenuItems
          transition
          anchor="bottom end"
          className="dropdown-panel min-w-44 [--anchor-gap:4px] [--anchor-padding:8px]"
        >
          <MenuItem>
            <button className="menu-item" aria-label="Copy link" onClick={() => void copy()}>
              <CopyFeedbackIcon copied={copied} size={14} />
              Copy link
            </button>
          </MenuItem>
          <MenuItem>
            <button className="menu-item" onClick={() => void share()}>
              <Share2 size={14} aria-hidden="true" />
              Share…
            </button>
          </MenuItem>
          <MenuItem>
            <button className="menu-item" onClick={onEdit}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          </MenuItem>
          <MenuItem>
            <button className="menu-item text-danger" onClick={onDelete}>
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  )
  const sheet = sheetOpen ? (
    <LinkActionSheet
      link={link}
      onClose={() => setSheetOpen(false)}
      onEdit={onEdit}
      onDelete={onDelete}
      onTag={onTag}
    />
  ) : null

  if (density === 'compact') {
    return (
      <article
        {...pressProps}
        className="card-interactive group flex min-h-12 items-center gap-2.5 rounded-lg border border-line/80 bg-surface py-1.5 pl-3 pr-1.5 hover:border-accent/50"
      >
        <Favicon url={link.url} domain={domain} size={18} />
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate py-2 text-sm font-medium leading-6 hover:text-accent hover:underline touch:min-h-11"
          aria-label={`External link: ${link.title}, from ${domain}, saved ${relative}, opens in a new tab`}
          title={link.title}
        >
          {link.title}
        </a>
        <span
          className="hidden max-w-28 shrink-0 truncate font-mono text-xs text-muted min-[380px]:block"
          title={link.url}
        >
          {domain}
        </span>
        {sortedTags.length > 0 && (
          <span
            className="shrink-0 rounded-full bg-soft px-1.5 py-0.5 text-[11px] leading-4 text-muted"
            title={sortedTags.map((tag) => tag.name).join(', ')}
            aria-label={`${sortedTags.length} ${sortedTags.length === 1 ? 'tag' : 'tags'}`}
          >
            {sortedTags.length}
          </span>
        )}
        {sheetTrigger}
        {desktopMenu}
        {sheet}
      </article>
    )
  }

  return (
    <article
      {...pressProps}
      className="card-interactive group relative rounded-xl border border-line/80 bg-surface p-3 shadow-xs hover:border-accent/50 sm:p-4 dark:shadow-none"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-5">
            <Favicon url={link.url} domain={domain} size={16} />
            <span className="max-w-32 truncate font-medium text-secondary" title={link.url}>
              {domain}
            </span>
            {link.source && (
              <>
                <span aria-hidden="true" className="shrink-0 text-muted">
                  ·
                </span>
                <span className="max-w-28 truncate text-muted">{link.source}</span>
              </>
            )}
            <span aria-hidden="true" className="shrink-0 text-muted">
              ·
            </span>
            <time
              className="shrink-0 whitespace-nowrap text-muted"
              dateTime={link.created_at}
              title={fullDate}
            >
              {relative}
            </time>
          </div>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`External link: ${link.title}, from ${domain}, saved ${relative}, opens in a new tab`}
            title={link.title}
            className="mt-1 block max-w-full text-[15px] font-semibold leading-snug hover:text-accent hover:underline touch:min-h-11"
          >
            <span className="line-clamp-2 [overflow-wrap:anywhere]">{link.title}</span>
            <ExternalLink
              size={12}
              className="ml-1.5 inline-block shrink-0 align-baseline text-muted"
              aria-hidden="true"
            />
          </a>
          {link.description && (
            <div className="mt-2 rounded-md border-l-2 border-accent/60 bg-soft/50 px-2.5 py-1.5 text-xs leading-relaxed text-secondary">
              <p className="line-clamp-2 whitespace-pre-line [overflow-wrap:anywhere]">
                <StickyNote
                  size={12}
                  className="mr-1 inline-block shrink-0 align-[-1px] text-muted"
                  aria-hidden="true"
                />
                {link.description}
              </p>
              {noteExpandable && (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 font-medium text-accent hover:underline touch:min-h-11 touch:min-w-11"
                  aria-label={`View full note for ${link.title}`}
                  onClick={() => setNoteModalOpen(true)}
                >
                  [more]
                </button>
              )}
            </div>
          )}
          {sortedTags.length > 0 && (
            <div
              data-tag-rail
              className="no-scrollbar -mx-1 mt-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
            >
              {sortedTags.map((tag) => (
                <button
                  key={tag.id}
                  data-row-tag
                  type="button"
                  className="tag h-6 shrink-0 rounded-full bg-soft px-2.5 py-0.5 text-xs text-secondary hover:bg-accent-soft hover:text-accent sm:h-5"
                  onClick={() => onTag(tag.name)}
                  aria-label={`Filter by ${tag.name}`}
                  title={tag.name}
                >
                  <span className="max-w-28 truncate">{tag.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-2.5 flex items-center gap-2 border-t border-line/60 pt-2 sm:hidden">
            <button
              type="button"
              className={`tap min-h-10 flex-1 gap-1.5 rounded-md bg-canvas/30 px-2 text-xs font-medium hover:bg-soft hover:text-ink active:bg-soft touch:min-h-11 ${copied ? 'text-accent' : 'text-secondary'}`}
              onClick={() => void copy()}
              aria-label={`Copy link address for ${link.title}`}
            >
              <CopyFeedbackIcon copied={copied} size={14} />
              Copy Link
            </button>
            <button
              type="button"
              className="tap min-h-10 flex-1 gap-1.5 rounded-md bg-canvas/30 px-2 text-xs font-medium text-secondary hover:bg-soft hover:text-ink active:bg-soft touch:min-h-11"
              onClick={() => void share()}
              aria-label={`Share ${link.title}`}
            >
              <Share2 size={14} aria-hidden="true" />
              Share
            </button>
          </div>
        </div>
        {sheetTrigger}
        {desktopMenu}
      </div>
      {sheet}
      {noteModalOpen && (
        <ViewNoteDialog link={link} onClose={() => setNoteModalOpen(false)} onEdit={onEdit} />
      )}
    </article>
  )
}
