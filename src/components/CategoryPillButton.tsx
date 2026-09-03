import { Icon } from '../ui/Icon'
import type { Category } from '../lib/types'

/**
 * Small category chooser — deliberately quiet so it never competes with the
 * amount or the keypad. Visible pill is 36px; the button around it keeps a
 * 44px touch target.
 */
export function CategoryPillButton({
  category,
  onClick,
}: {
  category: Category | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={category ? `分類：${category.label}，點擊變更` : '選擇分類'}
      className="group flex h-11 items-center"
    >
      <span className="flex h-9 items-center gap-1.5 rounded-full bg-fill pl-3 pr-2 text-callout text-primary transition-colors duration-100 group-active:bg-fill-strong">
        {category ? (
          <>
            <span className="text-body leading-none">{category.icon}</span>
            <span>{category.label}</span>
          </>
        ) : (
          <span className="text-secondary">選擇分類</span>
        )}
        <Icon name="chevronDown" size="sm" className="text-tertiary" />
      </span>
    </button>
  )
}
