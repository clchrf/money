import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function SectionHeader({ children }: { children: ReactNode }) {
  return <div className="px-5 pb-2 pt-6 text-footnote text-secondary">{children}</div>
}

/** iOS-style grouped container. Rows inside get their own hairlines. */
export function ListGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-4 overflow-hidden rounded-md bg-surface ${className}`}>
      <div className="divide-y divide-divider">{children}</div>
    </div>
  )
}

export function ListCaption({ children }: { children: ReactNode }) {
  return <p className="px-5 pt-2 text-caption leading-relaxed text-secondary">{children}</p>
}

type Accessory = 'chevron' | 'check' | 'none'

/**
 * The single list-row primitive: one height, one padding, one type ramp,
 * one alignment. Left is always a label (plus optional leading glyph),
 * right is a switch, chevron, check or value.
 */
export function ListRow({
  label,
  detail,
  value,
  leading,
  trailing,
  accessory = 'none',
  onClick,
  destructive = false,
  className = '',
}: {
  label: ReactNode
  detail?: ReactNode
  value?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  accessory?: Accessory
  onClick?: () => void
  destructive?: boolean
  className?: string
}) {
  const content = (
    <>
      {leading && <span className="flex w-6 shrink-0 justify-center text-body">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-callout ${destructive ? 'font-medium' : ''} text-primary`}>
          {label}
        </span>
        {detail && <span className="mt-0.5 block truncate text-caption text-secondary">{detail}</span>}
      </span>
      {value !== undefined && (
        <span className="shrink-0 text-callout tabular-nums text-secondary">{value}</span>
      )}
      {trailing}
      {accessory === 'chevron' && <Icon name="chevronRight" size="sm" className="shrink-0 text-tertiary" />}
      {accessory === 'check' && <Icon name="check" size="md" className="shrink-0 text-primary" />}
    </>
  )

  const shared = `flex w-full min-h-12 items-center gap-3 px-4 py-2.5 text-left ${className}`

  if (!onClick) return <div className={shared}>{content}</div>

  return (
    <button type="button" onClick={onClick} className={`${shared} transition-colors duration-100 active:bg-fill`}>
      {content}
    </button>
  )
}
