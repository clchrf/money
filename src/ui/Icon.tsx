import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  List,
  NotepadText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react'

/**
 * The app's only icon source. Every UI glyph goes through this map — no
 * Unicode characters, no per-component SVG, no second icon library.
 */
export const ICONS = {
  add: Plus,
  back: ChevronLeft,
  budget: ChartPie,
  calendar: CalendarDays,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  close: X,
  edit: Pencil,
  history: List,
  keyboardDelete: ArrowLeft,
  moveDown: ArrowDown,
  moveUp: ArrowUp,
  note: NotepadText,
  record: CirclePlus,
  reset: RotateCcw,
  search: Search,
  settings: Settings,
  trash: Trash2,
} as const

export type IconName = keyof typeof ICONS

/** Icon size tokens. Touch targets are separate — see IconButton. */
export const ICON_SIZE = {
  sm: 16,
  md: 20,
  lg: 24,
  /** Only the keypad's undo/backspace glyphs use this, to match their enlarged digits. */
  xl: 28,
} as const

export type IconSize = keyof typeof ICON_SIZE

export function Icon({
  name,
  size = 'md',
  className,
  strokeWidth = 1.75,
}: {
  name: IconName
  size?: IconSize
  className?: string
  strokeWidth?: number
}) {
  const Glyph = ICONS[name]
  return (
    <Glyph
      size={ICON_SIZE[size]}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  )
}
