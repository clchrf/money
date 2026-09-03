import { Icon, type IconName } from '../ui/Icon'

type Key = { key: string; label?: string; icon?: IconName; aria: string }

const KEYS: Key[] = [
  { key: '1', label: '1', aria: '1' },
  { key: '2', label: '2', aria: '2' },
  { key: '3', label: '3', aria: '3' },
  { key: '4', label: '4', aria: '4' },
  { key: '5', label: '5', aria: '5' },
  { key: '6', label: '6', aria: '6' },
  { key: '7', label: '7', aria: '7' },
  { key: '8', label: '8', aria: '8' },
  { key: '9', label: '9', aria: '9' },
  { key: 'clear', icon: 'reset', aria: '清除金額' },
  { key: '0', label: '0', aria: '0' },
  { key: 'del', icon: 'keyboardDelete', aria: '刪除一位數字' },
]

/**
 * Each key is its own lightweight button — no dividers, no cells, no
 * calculator chrome. Row height follows the viewport so the pad never
 * stretches to fill a tall screen.
 */
export function NumberPad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="mx-auto grid w-full max-w-[330px] grid-cols-3 gap-x-4 gap-y-1">
      {KEYS.map((k) => (
        <button
          key={k.key}
          type="button"
          aria-label={k.aria}
          onClick={() => onKey(k.key)}
          className="flex h-[clamp(56px,8.4dvh,76px)] w-full items-center justify-center rounded-full text-keypad text-primary transition-colors duration-100 active:bg-fill"
        >
          {k.icon ? <Icon name={k.icon} size="lg" strokeWidth={2} /> : k.label}
        </button>
      ))}
    </div>
  )
}
