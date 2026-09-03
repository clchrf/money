import { getUserId } from './user'
import { addTransaction } from './storage'
import type { FixedExpense, FixedFrequency } from './types'

const KEY = 'money.fixedExpenses'
const MAX_CATCHUP = 12

function readAll(): FixedExpense[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as FixedExpense[]
  } catch {
    return []
  }
}

function writeAll(all: FixedExpense[]) {
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function listFixedExpenses(): FixedExpense[] {
  const userId = getUserId()
  return readAll()
    .filter((f) => f.user_id === userId)
    .sort((a, b) => a.next_date.localeCompare(b.next_date))
}

export function addFixedExpense(input: {
  name: string
  amount: number
  category: string
  frequency: FixedFrequency
  next_date: string
  note?: string
  auto_record?: boolean
  reminder_enabled?: boolean
}): FixedExpense {
  const fx: FixedExpense = {
    id: crypto.randomUUID(),
    user_id: getUserId(),
    name: input.name,
    amount: input.amount,
    category: input.category,
    frequency: input.frequency,
    next_date: input.next_date,
    note: input.note ?? '',
    enabled: true,
    auto_record: input.auto_record ?? false,
    reminder_enabled: input.reminder_enabled ?? true,
  }
  const all = readAll()
  all.push(fx)
  writeAll(all)
  return fx
}

export function updateFixedExpense(id: string, patch: Partial<Omit<FixedExpense, 'id' | 'user_id'>>) {
  const userId = getUserId()
  const all = readAll()
  const idx = all.findIndex((f) => f.id === id && f.user_id === userId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...patch }
  writeAll(all)
}

export function deleteFixedExpense(id: string) {
  const userId = getUserId()
  writeAll(readAll().filter((f) => !(f.id === id && f.user_id === userId)))
}

function advance(dateStr: string, frequency: FixedFrequency): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1)
  } else {
    d.setDate(d.getDate() + 7)
  }
  return d.toISOString().slice(0, 10)
}

/**
 * Runs on app start. For enabled + auto_record fixed expenses whose
 * next_date has arrived, records the transaction and rolls next_date
 * forward (capped, so a long-dormant browser can't spawn a huge backlog).
 */
export function runAutoRecord(): number {
  const todayStr = new Date().toISOString().slice(0, 10)
  const all = readAll()
  let recorded = 0
  for (const fx of all) {
    if (!fx.enabled || !fx.auto_record) continue
    let guard = 0
    while (fx.next_date <= todayStr && guard < MAX_CATCHUP) {
      addTransaction({ amount: fx.amount, category: fx.category, note: fx.name, created_at: `${fx.next_date}T09:00:00.000Z` })
      fx.next_date = advance(fx.next_date, fx.frequency)
      recorded++
      guard++
    }
  }
  if (recorded > 0) writeAll(all)
  return recorded
}
