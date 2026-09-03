import { Icon, type IconName, type IconSize } from './Icon'

type Variant = 'plain' | 'filled' | 'accent'

const VARIANTS: Record<Variant, string> = {
  plain: 'text-secondary group-active:bg-fill',
  filled: 'bg-fill text-primary group-active:bg-fill-strong',
  accent: 'bg-accent text-on-accent group-active:opacity-80',
}

/**
 * The single icon-button primitive.
 *
 * Touch target is always 44×44; the visible circle (36 or 44) and the glyph
 * (16/20/24) size independently, so an icon is never scaled up just to fill
 * the hit area.
 */
export function IconButton({
  name,
  label,
  onClick,
  variant = 'plain',
  size = 'md',
  compact = false,
  disabled = false,
  className = '',
}: {
  name: IconName
  /** Required — becomes the accessible name. */
  label: string
  onClick: () => void
  variant?: Variant
  size?: IconSize
  /** Smaller visible circle (36px). The touch target stays 44px either way. */
  compact?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30 ${className}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full transition-colors duration-100 ${
          compact ? 'h-9 w-9' : 'h-11 w-11'
        } ${VARIANTS[variant]}`}
      >
        <Icon name={name} size={size} />
      </span>
    </button>
  )
}
