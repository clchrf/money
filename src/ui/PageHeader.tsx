import type { ReactNode } from 'react'

/** Large page title used by 紀錄 / 預算 / 設定 — one height, one type ramp. */
export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="safe-top shrink-0">
      <div className="flex h-14 items-center justify-between px-5">
        <h1 className="text-headline text-primary">{title}</h1>
        {action && <div className="-mr-2 flex items-center">{action}</div>}
      </div>
    </div>
  )
}
