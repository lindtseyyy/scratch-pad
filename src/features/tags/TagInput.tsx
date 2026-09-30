import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { normalizeTag } from '../../lib/tags'
import { errorMessage } from '../../lib/errors'
export function TagInput({
  id,
  value,
  onChange,
  suggestions,
  allowCreate = true,
  disabled = false,
}: {
  id: string
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  allowCreate?: boolean
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const toggleRef = useRef<HTMLButtonElement>(null)
  const matches = suggestions.filter(
    (name) => !value.includes(name) && name.includes(query.trim().toLowerCase()),
  )
  const normalized = query.trim().toLowerCase()
  const canCreate =
    allowCreate && normalized && !suggestions.includes(normalized) && !value.includes(normalized)
  const add = (name: string | null) => {
    if (!name) return
    try {
      const tag = normalizeTag(name)
      onChange([...new Set([...value, tag])])
      setQuery('')
      setError('')
    } catch (error) {
      setError(errorMessage(error))
    }
  }
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((name) => (
          <span key={name} className="tag">
            {name}
            <button
              type="button"
              className="ml-0.5 rounded p-0.5 hover:text-ink"
              disabled={disabled}
              aria-label={`Remove tag ${name}`}
              onClick={() => onChange(value.filter((tag) => tag !== name))}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <Combobox value={null} onChange={add} disabled={disabled} onClose={() => setQuery('')}>
        {({ open }) => (
          <>
            <div className="relative">
              <ComboboxInput
                id={id}
                className="input pr-9"
                placeholder={allowCreate ? 'Find or create a tag…' : 'Add a tag filter…'}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setError('')
                }}
                aria-describedby={`${id}-hint`}
                onKeyDown={(event) => {
                  if (
                    event.key === ',' &&
                    normalized &&
                    (allowCreate || suggestions.includes(normalized))
                  ) {
                    event.preventDefault()
                    add(normalized)
                    if (open) toggleRef.current?.click()
                  }
                  if (event.key === 'Backspace' && !query && value.length)
                    onChange(value.slice(0, -1))
                }}
              />
              <ComboboxButton
                ref={toggleRef}
                className="absolute right-1 top-1 rounded p-2 text-muted hover:text-ink"
                aria-label={allowCreate ? 'Show tag suggestions' : 'Show tag filters'}
              >
                <ChevronDown size={15} aria-hidden="true" />
              </ComboboxButton>
              <ComboboxOptions
                modal={false}
                className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-line bg-surface p-1 empty:invisible"
              >
                {matches.map((name) => (
                  <ComboboxOption
                    value={name}
                    key={name}
                    className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm data-focus:bg-soft"
                  >
                    {name}
                  </ComboboxOption>
                ))}
                {canCreate && (
                  <ComboboxOption
                    value={normalized}
                    className="cursor-pointer rounded px-3 py-2 text-sm text-accent data-focus:bg-soft"
                  >
                    Create “{normalized}”
                  </ComboboxOption>
                )}
                {!matches.length && !canCreate && (
                  <div className="px-3 py-2 text-sm text-muted">
                    {suggestions.length ? 'No matching tags' : 'No tags yet'}
                  </div>
                )}
              </ComboboxOptions>
            </div>
          </>
        )}
      </Combobox>
      <p
        id={`${id}-hint`}
        className={`mt-1.5 text-xs ${error ? 'text-danger' : 'text-muted'}`}
        role={error ? 'alert' : undefined}
      >
        {error ||
          (allowCreate
            ? 'Press Enter or comma to add a tag.'
            : 'Links must match every selected tag.')}
      </p>
    </div>
  )
}
