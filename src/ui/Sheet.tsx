import type { ReactNode } from 'react'

/**
 * iOS-style bottom sheet shell: scrim + rounded surface + grabber.
 * Sits above full-screen modals so sheets opened from a modal still work.
 */
export function Sheet({
  title,
  onDismiss,
  children,
  padded = false,
}: {
  title?: string
  onDismiss: () => void
  children: ReactNode
  padded?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="關閉"
        onClick={onDismiss}
        className="animate-scrim absolute inset-0 bg-scrim"
      />
      <div className="animate-sheet safe-bottom relative rounded-t-xl bg-surface">
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-fill-strong" />
        {title && <div className="px-5 pb-1 pt-3 text-center text-title text-primary">{title}</div>}
        <div className={padded ? 'px-5 pb-6 pt-4' : 'pb-2 pt-2'}>{children}</div>
      </div>
    </div>
  )
}

/**
 * Full-screen modal shell with a standard 44pt nav bar.
 * Left/right slots take TextButtons so every modal header matches.
 */
export function ModalScreen({
  title,
  left,
  right,
  children,
  footer,
  tone = 'plain',
}: {
  title: string
  left?: ReactNode
  right?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** `grouped` gives list-based modals the same recessed background as the list pages. */
  tone?: 'plain' | 'grouped'
}) {
  return (
    <div
      className={`animate-modal safe-top safe-bottom fixed inset-0 z-50 flex flex-col ${
        tone === 'grouped' ? 'bg-grouped' : 'bg-bg'
      }`}
    >
      <div className="mx-auto flex h-12 w-full max-w-md items-center justify-between px-4">
        <div className="flex min-w-16 justify-start">{left}</div>
        <span className="text-title text-primary">{title}</span>
        <div className="flex min-w-16 justify-end">{right}</div>
      </div>
      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col">{children}</div>
      {footer}
    </div>
  )
}
