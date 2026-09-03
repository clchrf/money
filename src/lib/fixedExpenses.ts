import {
  dbAddFixedExpense,
  dbAddTransaction,
  dbUpdateFixedExpense,
  dbDeleteFixedExpense,
  getState,
} from './store'
import type { FixedExpense, FixedFrequency } from './types'

const MAX_CATCHUP = 12

export function listFixedExpenses(): FixedExpense[] {
  return getState().fixedExpenses
}

export const addFixedExpense = (input: Omit<FixedExpense, 'id' | 'user_id' | 'enabled'>) =>
  dbAddFixedExpense(input)

export const updateFixedExpense = (id: string, patch: Partial<Omit<FixedExpense, 'id' | 'user_id'>>) =>
  dbUpdateFixedExpense(id, patch)

export const deleteFixedExpense = (id: string) => dbDeleteFixedExpense(id)

function advance(dateStr: string, frequency: FixedFrequency): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

/**
 * Runs on app start. For enabled + auto_record fixed expenses whose next_date
 * has arrived, records the transaction and rolls next_date forward (capped, so
 * a long-dormant account can't spawn a huge backlog).
 */
export async function runAutoRecord(): Promise<number> {
  const todayStr = new Date().toISOString().slice(0, 10)
  let recorded = 0

  for (const fx of listFixedExpenses()) {
    if (!fx.enabled || !fx.auto_record) continue
    let nextDate = fx.next_date
    let guard = 0
    while (nextDate <= todayStr && guard < MAX_CATCHUP) {
      await dbAddTransaction({
        amount: fx.amount,
        category: fx.category,
        note: fx.name,
        created_at: `${nextDate}T09:00:00.000Z`,
      })
      nextDate = advance(nextDate, fx.frequency)
      recorded++
      guard++
    }
    if (nextDate !== fx.next_date) await dbUpdateFixedExpense(fx.id, { next_date: nextDate })
  }
  return recorded
}
