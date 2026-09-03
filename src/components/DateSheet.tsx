import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { TextField } from '../ui/Field'

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

function offsetKey(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** Short label for the date pill: 今天 / 昨天 / 9月1日. */
export function formatDateLabel(key: string): string {
  if (key === todayKey()) return '今天'
  if (key === offsetKey(-1)) return '昨天'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

/** Timestamp for a chosen day — today keeps the real time, past days land at noon. */
export function dateKeyToISO(key: string): string {
  if (key === todayKey()) return new Date().toISOString()
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}

export function DateSheet({
  value,
  onSelect,
  onDismiss,
}: {
  value: string
  onSelect: (key: string) => void
  onDismiss: () => void
}) {
  const presets = [
    { key: todayKey(), label: '今天' },
    { key: offsetKey(-1), label: '昨天' },
  ]

  return (
    <Sheet title="日期" onDismiss={onDismiss}>
      <div className="px-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect(p.key)}
            className="flex min-h-12 w-full items-center gap-3 rounded-sm px-3 text-left transition-colors duration-100 active:bg-fill"
          >
            <span className="flex-1 text-body text-primary">{p.label}</span>
            {value === p.key && <Icon name="check" size="md" className="text-primary" />}
          </button>
        ))}
      </div>
      <div className="px-5 pb-4 pt-2">
        <span className="mb-2 block text-footnote text-secondary">其他日期</span>
        <TextField
          type="date"
          value={value}
          onChange={(v) => v && onSelect(v)}
          ariaLabel="選擇日期"
        />
      </div>
    </Sheet>
  )
}
