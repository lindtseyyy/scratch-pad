import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { domainOf } from '../../lib/url'
import type { SavedLink } from './api'
export function LinkRow({
  link,
  onEdit,
  onDelete,
  onTag,
}: {
  link: SavedLink
  onEdit: () => void
  onDelete: () => void
  onTag: (tag: string) => void
}) {
  const [expandedTags, setExpandedTags] = useState(false)
  const [visibleTags, setVisibleTags] = useState(Math.min(4, link.tags.length))
  const tagRowRef = useRef<HTMLDivElement>(null)
  const sortedTags = [...link.tags].sort((a, b) => a.name.localeCompare(b.name))
  useEffect(() => {
    const row = tagRowRef.current
    if (!row) return
    const measure = () => {
      const buttons = [...row.querySelectorAll<HTMLElement>('[data-row-tag]')]
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0
      const widths = buttons.map((button) => button.getBoundingClientRect().width)
      if (
        buttons.length <= 4 &&
        widths.reduce((sum, width) => sum + width, 0) + gap * (buttons.length - 1) <=
          row.clientWidth
      ) {
        setVisibleTags(buttons.length)
        return
      }
      let used = row.querySelector<HTMLElement>('[data-more-tags]')?.offsetWidth || 44
      let count = 0
      for (const width of widths.slice(0, 4)) {
        if (used + gap + width > row.clientWidth) break
        used += gap + width
        count++
      }
      setVisibleTags(Math.max(1, count))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [link.tags])
  return (
    <article className="group relative rounded-lg border border-line border-l-4 border-l-accent/60 bg-canvas/40 p-3 transition-colors hover:border-accent/50 hover:bg-accent-soft/40 focus-within:border-accent/60 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-baseline gap-2 text-[15px] font-medium leading-6 hover:text-accent hover:underline touch:min-h-11 touch:min-w-11"
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{link.title}</span>
            <ExternalLink size={12} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-5 text-muted">
            {link.source && (
              <>
                <span className="max-w-full font-medium text-secondary [overflow-wrap:anywhere]">
                  {link.source}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="max-w-full truncate font-mono" title={link.url}>
              {domainOf(link.url)}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <time
              className="basis-full sm:basis-auto"
              dateTime={link.created_at}
              title={link.created_at}
            >
              {new Date(link.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </div>
          {link.description && (
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm leading-5 text-secondary [overflow-wrap:anywhere]">
              {link.description}
            </p>
          )}
          {link.tags.length > 0 && (
            <div
              ref={tagRowRef}
              className={`relative mt-1.5 flex gap-1.5 touch:gap-2 sm:flex-wrap ${expandedTags ? 'flex-wrap' : ''}`}
            >
              {sortedTags.map((tag, index) => (
                <button
                  key={tag.id}
                  data-row-tag
                  type="button"
                  className={`tag shrink-0 hover:bg-accent-soft hover:text-accent ${!expandedTags && sortedTags.length > 1 ? 'max-sm:max-w-[calc(100%_-_4rem)]' : ''} ${!expandedTags && index >= visibleTags ? 'max-sm:pointer-events-none max-sm:absolute max-sm:left-0 max-sm:top-0 max-sm:invisible' : ''}`}
                  onClick={() => onTag(tag.name)}
                  aria-label={`Filter by ${tag.name}`}
                >
                  <span className="min-w-0 max-sm:truncate sm:break-all">{tag.name}</span>
                </button>
              ))}
              {sortedTags.length > 1 && (
                <button
                  type="button"
                  data-more-tags
                  className={`tag shrink-0 hover:bg-accent-soft hover:text-accent sm:hidden ${!expandedTags && visibleTags === sortedTags.length ? 'pointer-events-none absolute left-0 top-0 invisible' : ''}`}
                  aria-label={
                    expandedTags
                      ? 'Show fewer tags'
                      : `Show ${sortedTags.length - visibleTags} more tags`
                  }
                  aria-expanded={expandedTags}
                  onClick={() => setExpandedTags(!expandedTags)}
                >
                  {expandedTags ? 'Less' : `+${sortedTags.length - visibleTags}`}
                </button>
              )}
            </div>
          )}
        </div>
        <Menu>
          <MenuButton
            className="mt-0.5 shrink-0 rounded p-2.5 text-muted hover:bg-soft hover:text-ink touch:p-3 touch:min-h-11 touch:min-w-11"
            aria-label={`Actions for ${link.title}`}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            className="dropdown-panel min-w-36 [--anchor-gap:4px] [--anchor-padding:8px]"
          >
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
    </article>
  )
}
