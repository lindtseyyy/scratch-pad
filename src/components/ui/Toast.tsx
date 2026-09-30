import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
const ToastContext = createContext<(message: string) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null)
  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(timeout)
  }, [toast])
  return (
    <ToastContext.Provider value={(message) => setToast({ message, id: Date.now() })}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-40px)]"
      >
        {toast && (
          <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-3 text-sm shadow-sm">
            <Check size={16} className="text-accent" aria-hidden="true" />
            {toast.message}
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-muted"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)
