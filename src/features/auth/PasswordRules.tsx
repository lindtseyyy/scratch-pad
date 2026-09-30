import { Check, Minus } from 'lucide-react'
import { passwordRules } from '../../lib/password-rules'
export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="grid gap-1.5 text-xs sm:grid-cols-2" aria-label="Password requirements">
      {passwordRules.map((rule) => {
        const passes = rule.test(password)
        const Icon = passes ? Check : Minus
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-2 ${passes ? 'text-accent' : 'text-muted'}`}
          >
            <Icon size={13} aria-hidden="true" />
            <span className="sr-only">{passes ? 'Met: ' : 'Needed: '}</span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
