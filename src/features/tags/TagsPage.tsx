import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import {
  Button,
  EmptyState,
  InlineError,
  Input,
  Modal,
  Select,
  Spinner,
} from '../../components/ui/primitives'
import { useToast } from '../../components/ui/Toast'
import { errorMessage } from '../../lib/errors'
import { useCreateTag, useDeleteTag, useRenameTag, useTags } from './hooks'
import type { Tag } from '../links/api'
import { tagLibraryUrl } from '../../lib/tags'

function TagRow({ tag, onDelete }: { tag: Tag; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)
  const [error, setError] = useState('')
  const rename = useRenameTag()
  const toast = useToast()
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await rename.mutateAsync({ id: tag.id, name })
      setEditing(false)
      toast('Tag renamed on every link.')
    } catch (error) {
      setError(errorMessage(error))
    }
  }
  return (
    <div className="border-b border-line py-3">
      {editing ? (
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor={`rename-${tag.id}`}>
            New tag name for {tag.name}
          </label>
          <Input
            id={`rename-${tag.id}`}
            className="min-w-0 flex-1"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            required
            disabled={rename.isPending}
          />
          <Button type="submit" disabled={rename.isPending}>
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={rename.isPending}
            onClick={() => {
              setEditing(false)
              setName(tag.name)
              setError('')
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="tag break-all hover:text-accent" to={tagLibraryUrl(tag.name)}>
              {tag.name}
            </Link>
            <span className="shrink-0 text-xs text-muted">
              {tag.link_count} {tag.link_count === 1 ? 'link' : 'links'}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              className="px-2 touch:min-w-11"
              aria-label={`Rename ${tag.name}`}
              onClick={() => {
                setName(tag.name)
                setEditing(true)
              }}
            >
              <Pencil size={15} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              className="px-2 text-danger touch:min-w-11"
              aria-label={`Delete ${tag.name}`}
              onClick={onDelete}
            >
              <Trash2 size={15} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-2">
          <InlineError>{error}</InlineError>
        </div>
      )}
    </div>
  )
}
export function TagsPage() {
  const tags = useTags()
  const [sort, setSort] = useState('name')
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<Tag | null>(null)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const create = useCreateTag()
  const remove = useDeleteTag()
  const toast = useToast()
  const rows = [...(tags.data || [])].sort((a, b) =>
    sort === 'usage'
      ? b.link_count - a.link_count || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name),
  )
  return (
    <main id="main" className="page">
      <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
      <p className="mt-1 text-sm text-muted">A little order for everything you collect.</p>
      <div className="mt-7 flex flex-col items-end justify-between gap-4 sm:flex-row sm:flex-wrap">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            try {
              await create.mutateAsync(name)
              setName('')
              toast('Tag created.')
            } catch (error) {
              setError(errorMessage(error))
            }
          }}
          className="flex w-full min-w-0 gap-2 sm:w-auto sm:flex-1"
        >
          <label htmlFor="new-tag" className="sr-only">
            New tag name
          </label>
          <Input
            id="new-tag"
            placeholder="Create a tag…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            disabled={create.isPending}
            className="min-w-0 flex-1 sm:max-w-xs"
          />
          <Button
            type="submit"
            variant="secondary"
            className="shrink-0"
            disabled={!name.trim() || create.isPending}
          >
            Add tag
          </Button>
        </form>
        <div>
          <label id="tag-sort-label" htmlFor="tag-sort" className="sr-only">
            Sort tags
          </label>
          <Select
            id="tag-sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'name', label: 'Name A–Z' },
              { value: 'usage', label: 'Most used' },
            ]}
          />
        </div>
      </div>
      {error && (
        <div className="mt-3">
          <InlineError>{error}</InlineError>
        </div>
      )}
      <div className="mt-5 border-t border-line">
        {tags.isPending ? (
          <Spinner label="Loading tags…" />
        ) : tags.isError ? (
          <div className="py-5">
            <InlineError>{errorMessage(tags.error)}</InlineError>
            <Button className="mt-3" variant="secondary" onClick={() => void tags.refetch()}>
              Try again
            </Button>
          </div>
        ) : !rows.length ? (
          <EmptyState
            title="A blank slate."
            description="Create a tag here, or add one as you save a link. A link can belong to as many tags as you like."
          />
        ) : (
          rows.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              onDelete={() => {
                setDeleteError('')
                setDeleting(tag)
              }}
            />
          ))
        )}
      </div>
      {deleting && (
        <Modal
          variant="sheet"
          title={`Delete “${deleting.name}”?`}
          description={`This removes the tag from ${deleting.link_count} ${deleting.link_count === 1 ? 'link' : 'links'}. All of your links will be kept.`}
          onClose={() => {
            if (!remove.isPending) setDeleting(null)
          }}
        >
          {deleteError && <InlineError>{deleteError}</InlineError>}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              data-autofocus
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Keep tag
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync(deleting.id)
                  setDeleting(null)
                  toast('Tag deleted. Your links are still here.')
                } catch (error) {
                  setDeleteError(errorMessage(error))
                }
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete tag'}
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
