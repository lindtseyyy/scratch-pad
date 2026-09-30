import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
  return (
    <article className="group relative border-b border-line py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-baseline gap-2 break-words text-[15px] font-medium leading-6 hover:text-accent hover:underline"
          >
            {link.title}
            <ExternalLink size={12} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-5 text-muted">
            {link.source && (
              <>
                <span className="font-medium text-secondary">{link.source}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="max-w-full truncate font-mono" title={link.url}>
              {domainOf(link.url)}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={link.created_at} title={link.created_at}>
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
            <p className="mt-1 line-clamp-2 whitespace-pre-line break-words text-sm leading-5 text-secondary">
              {link.description}
            </p>
          )}
          {link.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[...link.tags]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="tag hover:bg-accent-soft hover:text-accent"
                    onClick={() => onTag(tag.name)}
                    aria-label={`Filter by ${tag.name}`}
                  >
                    {tag.name}
                  </button>
                ))}
            </div>
          )}
        </div>
        <Menu>
          <MenuButton
            className="mt-0.5 rounded p-2 text-muted hover:bg-soft hover:text-ink"
            aria-label={`Actions for ${link.title}`}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            className="z-20 min-w-36 rounded-md border border-line bg-surface p-1 [--anchor-gap:4px]"
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
