import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Check, X } from 'lucide-react'

type ToastOptions = { action?: { label: string; onClick: () => void }; persist?: boolean }
type Toast = ToastOptions & { message: string; id: number }
const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {})

function Notification({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  useEffect(() => {
    if (toast.persist) return
    const timeout = setTimeout(() => dismiss(toast.id), 4500)
    return () => clearTimeout(timeout)
  }, [toast, dismiss])
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-3 text-sm shadow-sm">
      <Check size={16} className="shrink-0 text-accent" aria-hidden="true" />
      <span className="min-w-0 flex-1 break-words">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="tap rounded px-2 font-medium text-accent hover:bg-soft"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="tap rounded p-1 text-muted"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const show = useCallback((message: string, options: ToastOptions = {}) => {
    const toast = { ...options, message, id: ++nextId.current }
    // Routine save notices must not replace a pending update's Reload action.
    setToasts((current) => [...current.filter((item) => item.persist), toast])
  }, [])
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 space-y-2 sm:left-auto sm:right-[max(1.25rem,env(safe-area-inset-right))] sm:max-w-[calc(100vw-40px)]"
      >
        {toasts.map((toast) => (
          <Notification key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)
