import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { X, LoaderCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  Ref,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  return <button className={`button button-${variant} ${className}`} {...props} />
}
export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input className={`input ${className}`} {...props} />
}
export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input resize-y ${className}`} {...props} />
}
export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`input ${className}`} {...props} />
}
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-surface p-3 text-sm text-danger"
    >
      {children}
    </p>
  )
}
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
      {label}
    </div>
  )
}
export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Headless UI skips input focus on touch devices. This app's quick-save flow
    // explicitly focuses the title (or URL) and confirmations focus their safe action.
    const frame = requestAnimationFrame(() =>
      panelRef.current
        ?.querySelector<HTMLElement>('[data-autofocus]')
        ?.focus({ preventScroll: true }),
    )
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <Dialog open onClose={onClose} className="fixed inset-0 z-40">
      <div className="fixed inset-0 bg-black/35" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6">
          <DialogPanel
            ref={panelRef}
            className="min-h-dvh w-full max-w-lg border border-line bg-surface p-5 sm:min-h-0 sm:rounded-lg sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                {description && (
                  <Description className="mt-1 text-sm text-muted">{description}</Description>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                aria-label="Close dialog"
                onClick={onClose}
                className="-mr-2 -mt-2 px-2"
              >
                <X size={18} aria-hidden="true" />
              </Button>
            </div>
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="py-16 text-center">
      <p className="text-base font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
