import type { ReactNode } from 'react'

type Variant = 'accent' | 'fill' | 'plain'

const VARIANTS: Record<Variant, string> = {
  accent: 'bg-accent text-on-accent active:opacity-80 disabled:bg-fill disabled:text-tertiary',
  fill: 'bg-fill text-primary active:bg-fill-strong disabled:text-tertiary',
  plain: 'text-primary active:opacity-50 disabled:text-tertiary',
}

/** Full-width action button. Height 48, radius md. */
export function Button({
  children,
  onClick,
  variant = 'accent',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  variant?: Variant
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 w-full rounded-md text-title transition-colors duration-100 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/** Nav-bar / inline text action. Keeps a 44px touch height without looking like a button. */
export function TextButton({
  children,
  onClick,
  emphasis = 'normal',
  disabled = false,
}: {
  children: ReactNode
  onClick: () => void
  emphasis?: 'normal' | 'strong'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`-mx-2 flex h-11 items-center px-2 text-body transition-opacity duration-100 active:opacity-50 disabled:opacity-30 ${
        emphasis === 'strong' ? 'font-semibold text-primary' : 'text-secondary'
      }`}
    >
      {children}
    </button>
  )
}
