// Matches GoTrue's lower_upper_letters_digits_symbols requirement.
export const passwordRules = [
  { label: 'At least 12 characters', test: (value: string) => value.length >= 12 },
  { label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'A number', test: (value: string) => /[0-9]/.test(value) },
  {
    label: 'A symbol',
    test: (value: string) => /[!@#$%^&*()_+\-=[\]{};'":\\|,.<>/?`~]/.test(value),
  },
]
export const isStrongPassword = (value: string) => passwordRules.every((rule) => rule.test(value))
