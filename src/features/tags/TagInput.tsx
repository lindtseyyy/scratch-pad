import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { normalizeTag } from '../../lib/tags'
import { errorMessage } from '../../lib/errors'
export function TagInput({
  id,
  value,
  onChange,
  suggestions,
  popularTags = [],
  allowCreate = true,
  disabled = false,
}: {
  id: string
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  popularTags?: string[]
  allowCreate?: boolean
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const [showPopular, setShowPopular] = useState(false)
  const fieldRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!focused || !matchMedia('(pointer: coarse)').matches) return
    const scroll = () => fieldRef.current?.scrollIntoView({ block: 'center' })
    // Recenter after the virtual keyboard has resized the visible viewport.
    const timer = setTimeout(scroll, 300)
    scroll()
    window.visualViewport?.addEventListener('resize', scroll)
    return () => {
      clearTimeout(timer)
      window.visualViewport?.removeEventListener('resize', scroll)
    }
  }, [focused])
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
    <div
      ref={fieldRef}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 touch:gap-2">
          {value.map((name) => (
            <span key={name} className="tag">
              <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
              <button
                type="button"
                className="tap ml-0.5 rounded p-0.5 hover:text-ink"
                disabled={disabled}
                aria-label={`Remove tag ${name}`}
                onClick={() => onChange(value.filter((tag) => tag !== name))}
              >
                <X size={12} className="touch:size-4" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Combobox value={null} onChange={add} disabled={disabled} onClose={() => setQuery('')}>
        {({ open }) => (
          <>
            <div className="relative">
              <ComboboxInput
                id={id}
                className="input pr-11"
                placeholder={allowCreate ? 'Find or create a tag…' : 'Add a tag filter…'}
                value={query}
                onFocus={() => {
                  setFocused(true)
                  setShowPopular(true)
                }}
                enterKeyHint="done"
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(e) => {
                  setQuery(e.target.value)
                  setError('')
                }}
                aria-describedby={error || allowCreate ? `${id}-hint` : undefined}
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
                className="tap absolute inset-y-0 right-0 w-11 rounded-r-md text-muted hover:text-ink"
                aria-label={allowCreate ? 'Show tag suggestions' : 'Show tag filters'}
              >
                <ChevronDown size={16} aria-hidden="true" />
              </ComboboxButton>
              <ComboboxOptions
                transition
                anchor={{ to: 'bottom start', gap: 4, padding: 8 }}
                modal={false}
                className="dropdown-panel w-[var(--input-width)] empty:invisible"
              >
                {matches.map((name) => (
                  <ComboboxOption value={name} key={name} className="dropdown-option break-all">
                    {name}
                  </ComboboxOption>
                ))}
                {canCreate && (
                  <ComboboxOption
                    value={normalized}
                    className="dropdown-option break-all text-accent"
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
      {showPopular && popularTags.some((name) => !value.includes(name)) && (
        <div
          role="group"
          aria-label="Most-used tags"
          // Keep the chip area in place after blur so the Save target cannot move
          // between pointerdown and click. Typed suggestions occupy the same area.
          className={`mt-2 hidden flex-wrap gap-2 touch:flex ${query.trim() ? 'invisible' : ''}`}
        >
          {popularTags
            .filter((name) => !value.includes(name))
            .map((name) => (
              <button
                key={name}
                type="button"
                className="tag break-all hover:bg-accent-soft hover:text-accent"
                disabled={disabled}
                aria-label={`Add tag ${name}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => add(name)}
              >
                {name}
              </button>
            ))}
        </div>
      )}
      {(error || allowCreate) && (
        <p
          id={`${id}-hint`}
          className={`mt-1.5 text-xs ${error ? 'text-danger' : 'text-muted'}`}
          role={error ? 'alert' : undefined}
        >
          {error || 'Press Enter or comma to add a tag.'}
        </p>
      )}
    </div>
  )
}
