import { useRef, useState } from 'react'

// Keep the dialog's content mounted until Headless UI has finished both exits.
// Actions that open another dialog run afterwards so their focus traps don't overlap.
export function useModalTransition() {
  const [open, setOpen] = useState(true)
  const exitAction = useRef<(() => void) | null>(null)

  const close = (action: () => void) => {
    if (exitAction.current) return
    exitAction.current = action
    setOpen(false)
  }
  const afterLeave = () => {
    const action = exitAction.current
    exitAction.current = null
    action?.()
  }

  return { open, close, afterLeave }
}
