import { useState, type FormEvent } from 'react'
import { Modal, Button, Field, Input, Textarea, InlineError } from '../../components/ui/primitives'
import { TagInput } from '../tags/TagInput'
import { useTags } from '../tags/hooks'
import { useLinkByUrl, useSaveLink } from './hooks'
import { defaultTitle, LINK_TITLE_MAX_LENGTH, normalizeUrl } from '../../lib/url'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { detectSource } from '../../lib/source'
import { errorMessage } from '../../lib/errors'
import { useToast } from '../../components/ui/Toast'
import type { SavedLink } from './api'

export function LinkFormDialog({
  link,
  initialUrl = '',
  initialTitle = '',
  onClose,
  onEditDuplicate,
}: {
  link?: SavedLink
  initialUrl?: string
  initialTitle?: string
  onClose: () => void
  onEditDuplicate: (link: SavedLink) => void
}) {
  const [url, setUrl] = useState(link?.url || initialUrl)
  const [title, setTitle] = useState(link?.title ?? initialTitle)
  const online = useOnlineStatus()
  const [source, setSource] = useState(link?.source || (initialUrl ? detectSource(initialUrl) : ''))
  const [sourceEdited, setSourceEdited] = useState(!!link)
  const [description, setDescription] = useState(link?.description || '')
  const [tagNames, setTagNames] = useState(link?.tags.map((tag) => tag.name) || [])
  const [error, setError] = useState('')
  const save = useSaveLink()
  const tags = useTags()
  const toast = useToast()
  let normalized = ''
  try {
    normalized = normalizeUrl(url)
  } catch {
    /* Show URL validation on submit. */
  }
  const duplicate = useLinkByUrl(normalized, link?.id)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (save.isPending || !online) return
    setError('')
    try {
      const normalizedUrl = normalizeUrl(url)
      await save.mutateAsync({
        id: link?.id,
        url: normalizedUrl,
        title: title.trim() || defaultTitle(normalizedUrl),
        source,
        description,
        tags: tagNames,
      })
      toast(link ? 'Link updated.' : 'Link saved for later.')
      onClose()
    } catch (error) {
      setError(errorMessage(error))
    }
  }
  return (
    <Modal
      variant="page"
      compactAction={
        <Button
          type="submit"
          form="link-form"
          disabled={!online || save.isPending || !url.trim()}
          aria-describedby={!online ? 'link-offline-hint' : undefined}
        >
          {save.isPending ? 'Saving…' : link ? 'Save changes' : 'Save link'}
        </Button>
      }
      title={link ? 'Edit link' : 'Save for later'}
      description={
        link
          ? 'Update the details. The original save date stays the same.'
          : 'A link, a little context, and a way back.'
      }
      onClose={() => {
        if (!save.isPending) onClose()
      }}
    >
      <form
        id="link-form"
        onSubmit={submit}
        className="space-y-4"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.requestSubmit()
          }
        }}
      >
        {error && <InlineError>{error}</InlineError>}
        {!online && (
          <p id="link-offline-hint" role="status" className="text-sm text-muted">
            Reconnect to save.
          </p>
        )}
        <fieldset disabled={save.isPending} className="space-y-4">
          <Field id="link-url" label="URL">
            <Input
              id="link-url"
              data-autofocus={!initialUrl && !link ? true : undefined}
              value={url}
              onChange={(event) => {
                const value = event.target.value
                setUrl(value)
                if (!sourceEdited) {
                  try {
                    setSource(detectSource(normalizeUrl(value)))
                  } catch {
                    setSource('')
                  }
                }
              }}
              required
              maxLength={2048}
              placeholder="https://example.com/something-good"
              autoComplete="url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
          {duplicate.data && (
            <p className="rounded-md bg-accent-soft px-3 py-2 text-xs leading-relaxed text-secondary">
              You saved this on{' '}
              {new Date(duplicate.data.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              .{' '}
              <button
                type="button"
                className="tap font-medium text-accent underline"
                onClick={() => onEditDuplicate(duplicate.data!)}
              >
                Edit the saved link
              </button>
              , or save another copy.
            </p>
          )}
          <Field
            id="link-title"
            label="Title"
            hint="Leave blank to use a readable title from the URL."
          >
            <Input
              id="link-title"
              data-autofocus={initialUrl || link ? true : undefined}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={LINK_TITLE_MAX_LENGTH}
              placeholder="What would you like to remember?"
              aria-describedby="link-title-hint"
            />
          </Field>
          <Field id="link-tags" label="Tags">
            <TagInput
              id="link-tags"
              value={tagNames}
              onChange={setTagNames}
              suggestions={(tags.data || []).map((tag) => tag.name)}
              popularTags={[...(tags.data || [])]
                .sort((a, b) => b.link_count - a.link_count || a.name.localeCompare(b.name))
                .slice(0, 8)
                .map((tag) => tag.name)}
              disabled={save.isPending}
            />
          </Field>
          {tags.isError && (
            <p className="text-xs text-danger">
              Existing tags couldn’t load. You can still enter tags by name.
            </p>
          )}
          <Field id="link-description" label="Note (optional)">
            <Textarea
              id="link-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Why you saved it, or what to come back to…"
            />
          </Field>
          <Field id="link-source" label="Source">
            <Input
              id="link-source"
              value={source}
              onChange={(e) => {
                setSourceEdited(true)
                setSource(e.target.value)
              }}
              maxLength={60}
              placeholder="Detected from your link"
            />
          </Field>
        </fieldset>
        <div className="sticky bottom-0 hidden items-center justify-between gap-4 border-t border-line bg-surface py-4 sm:flex">
          <span className="hidden text-xs text-muted fine:block">Ctrl / ⌘ + Enter to save</span>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!online || save.isPending || !url.trim()}
              aria-describedby={!online ? 'link-offline-hint' : undefined}
            >
              {save.isPending ? 'Saving…' : link ? 'Save changes' : 'Save link'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
