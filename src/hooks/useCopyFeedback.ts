import { useEffect, useRef, useState } from 'react'
import { copyToClipboard } from '../lib/clipboard'
import { buzz } from '../lib/haptics'

export function useCopyFeedback() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])

  const copy = async (text: string) => {
    const ok = await copyToClipboard(text)
    if (!mounted.current) return ok
    clearTimeout(timer.current)
    setCopied(ok)
    if (ok) {
      buzz()
      timer.current = setTimeout(() => setCopied(false), 1200)
    }
    return ok
  }

  return { copied, copy }
}
