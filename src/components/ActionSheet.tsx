export interface ActionSheetItem {
  label: string
  onSelect: () => void
  emphasis?: boolean
}

/** iOS action sheet: grouped choices plus a separated cancel affordance. */
export function ActionSheet({
  items,
  onDismiss,
}: {
  items: ActionSheetItem[]
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="關閉"
        onClick={onDismiss}
        className="animate-scrim absolute inset-0 bg-scrim"
      />
      <div className="animate-sheet safe-bottom relative mx-auto flex w-full max-w-md flex-col gap-2 px-3 pb-3">
        <div className="overflow-hidden rounded-md bg-surface">
          <div className="divide-y divide-divider">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onSelect}
                className={`h-14 w-full text-center text-body text-primary transition-colors duration-100 active:bg-fill ${
                  item.emphasis ? 'font-semibold' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="h-14 w-full rounded-md bg-surface text-center text-body font-semibold text-primary transition-colors duration-100 active:bg-fill"
        >
          取消
        </button>
      </div>
    </div>
  )
}
