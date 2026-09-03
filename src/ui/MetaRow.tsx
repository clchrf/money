import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/**
 * Left-aligned information row used under the amount on the record screen:
 * a leading glyph, a label, and a quiet chevron. Not a card, not a pill —
 * it reads as information, so it never competes with the amount.
 */
export function MetaRow({
  leading,
  icon,
  label,
  muted = false,
  chevron = false,
  onClick,
  ariaLabel,
}: {
  /** Category emoji, when the row represents a category. */
  leading?: ReactNode
  /** UI glyph, when the row has no emoji. */
  icon?: IconName
  label: string
  muted?: boolean
  chevron?: boolean
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group flex h-12 w-full items-center gap-3 text-left"
    >
      <span className="flex w-6 shrink-0 items-center justify-center">
        {leading ?? (icon && <Icon name={icon} size="md" className={muted ? 'text-tertiary' : 'text-secondary'} />)}
      </span>
      <span
        className={`truncate text-body ${muted ? 'text-tertiary' : 'font-medium text-primary'} transition-opacity duration-100 group-active:opacity-60`}
      >
        {label}
      </span>
      {chevron && (
        <Icon name="chevronDown" size="sm" className="shrink-0 text-tertiary transition-opacity duration-100 group-active:opacity-60" />
      )}
    </button>
  )
}
