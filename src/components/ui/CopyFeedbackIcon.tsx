import { Check, Copy } from 'lucide-react'

export function CopyFeedbackIcon({ copied, size = 16 }: { copied: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      data-copied={copied ? '' : undefined}
      className="copy-feedback-icon relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Copy size={size} className="copy-idle absolute inset-0" />
      <Check size={size} className="copy-success absolute inset-0 text-accent" />
    </span>
  )
}
