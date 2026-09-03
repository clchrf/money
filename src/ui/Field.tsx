import type { ChangeEvent, ReactNode } from 'react'
import { Icon } from './Icon'

/** Text input. Height 44, radius sm, fill background. */
export function TextField({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  align = 'left',
  className = '',
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'date' | 'email'
  inputMode?: 'text' | 'decimal' | 'email'
  align?: 'left' | 'center'
  className?: string
  ariaLabel?: string
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      aria-label={ariaLabel ?? placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-11 w-full rounded-sm bg-fill px-4 text-body text-primary outline-none placeholder:text-placeholder ${
        align === 'center' ? 'text-center' : ''
      } ${className}`}
    />
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-sm bg-fill px-3">
      <Icon name="search" size="sm" className="shrink-0 text-tertiary" />
      <input
        value={value}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        /* Fills the row so the whole 44px control is tappable, not just the text line. */
        className="h-full min-w-0 flex-1 bg-transparent text-body text-primary outline-none placeholder:text-placeholder"
      />
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-footnote text-secondary">{children}</label>
}

/** Two-option segmented control (period / frequency pickers). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  fullWidth?: boolean
}) {
  return (
    <div className={`flex rounded-full bg-fill p-0.5 ${fullWidth ? 'w-full' : 'inline-flex'}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          /* 44px tall so it matches TextField and clears the touch-target minimum. */
          className={`h-11 rounded-full px-4 text-footnote font-medium transition-colors duration-100 ${
            fullWidth ? 'flex-1' : ''
          } ${value === opt.value ? 'bg-accent text-on-accent' : 'text-secondary'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
