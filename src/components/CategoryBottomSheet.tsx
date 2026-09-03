import { listCategories } from '../lib/categories'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { useStore } from '../lib/useStore'

export function CategoryBottomSheet({
  selected,
  onSelect,
  onDismiss,
  filterIds,
}: {
  selected: string | null
  onSelect: (id: string) => void
  onDismiss: () => void
  /** When set, only these category ids are offered (e.g. ones without a budget yet). */
  filterIds?: string[]
}) {
  useStore()
  const categories = listCategories().filter((c) => !filterIds || filterIds.includes(c.id))

  return (
    <Sheet title="選擇分類" onDismiss={onDismiss}>
      <div className="max-h-[58dvh] overflow-y-auto px-2">
        {categories.map((cat) => {
          const isActive = selected === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="flex min-h-12 w-full items-center gap-3 rounded-sm px-3 text-left transition-colors duration-100 active:bg-fill"
            >
              <span className="flex w-6 justify-center text-body">{cat.icon}</span>
              <span className="flex-1 text-body text-primary">{cat.label}</span>
              {isActive && <Icon name="check" size="md" className="text-primary" />}
            </button>
          )
        })}
        {categories.length === 0 && (
          <p className="py-8 text-center text-callout text-secondary">沒有可選分類</p>
        )}
      </div>
    </Sheet>
  )
}
