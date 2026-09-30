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
  variant = 'page',
  compactAction,
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  variant?: 'page' | 'sheet'
  compactAction?: ReactNode
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
            data-modal-panel
            className={`flex max-h-dvh w-full flex-col border border-line bg-surface sm:max-h-[calc(100dvh-3rem)] sm:max-w-lg sm:rounded-lg ${variant === 'page' ? 'h-dvh sm:h-auto' : 'rounded-t-xl'}`}
          >
            <div
              className={`flex shrink-0 items-center gap-3 bg-surface pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-4 ${variant === 'page' ? 'border-b border-line pb-3 sm:border-0 sm:pb-0' : 'pt-5'}`}
            >
              <Button
                type="button"
                variant="ghost"
                aria-label="Close dialog"
                onClick={onClose}
                className={`shrink-0 px-2 sm:order-3 sm:-mr-2 ${variant === 'sheet' ? 'order-3 -mr-2' : '-ml-2 sm:ml-0'}`}
              >
                <X size={18} aria-hidden="true" />
              </Button>
              <DialogTitle className="min-w-0 flex-1 break-words text-lg font-semibold">
                {title}
              </DialogTitle>
              {compactAction && <div className="shrink-0 sm:hidden">{compactAction}</div>}
            </div>
            <div className="min-h-0 overflow-y-auto pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
              {description && (
                <Description className="mb-5 break-words text-sm text-muted">
                  {description}
                </Description>
              )}
              {children}
            </div>
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
