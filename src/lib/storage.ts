import {
  dbAddTransaction,
  dbDeleteTransaction,
  dbImportTransactions,
  dbUpdateTransaction,
  getState,
} from './store'
import { getCategory } from './categories'
import type { Transaction } from './types'

/** Reads are synchronous against the in-memory mirror; writes go to Supabase. */
export function listTransactions(): Transaction[] {
  return getState().transactions
}

export const addTransaction = (input: {
  amount: number
  category: string
  note?: string
  created_at?: string
}) => dbAddTransaction(input)

export const updateTransaction = (
  id: string,
  patch: Partial<Pick<Transaction, 'amount' | 'category' | 'note'>>,
) => dbUpdateTransaction(id, patch)

export const deleteTransaction = (id: string) => dbDeleteTransaction(id)

export function exportJSON(): string {
  return JSON.stringify(
    {
      userId: getState().userId,
      exportedAt: new Date().toISOString(),
      transactions: listTransactions().map((t) => ({
        ...t,
        categoryName: getCategory(t.category).label,
      })),
    },
    null,
    2,
  )
}

export function exportCSV(): string {
  const rows = [['date', 'category', 'amount', 'note']]
  for (const t of listTransactions()) {
    rows.push([
      t.created_at,
      getCategory(t.category).label,
      String(t.amount),
      t.note.replace(/[\n,]/g, ' '),
    ])
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
}

/**
 * Import matches categories by name so a file exported from another device
 * lands in the right buckets; anything unmatched falls back to the first
 * category rather than being dropped.
 */
export async function importData(json: string): Promise<void> {
  const parsed = JSON.parse(json) as {
    transactions?: (Partial<Transaction> & { categoryName?: string })[]
  }
  if (!Array.isArray(parsed.transactions)) throw new Error('invalid file')

  const categories = getState().categories
  const byName = new Map(categories.map((c) => [c.label, c.id]))
  const byId = new Set(categories.map((c) => c.id))
  const fallback = categories[0]?.id ?? ''

  const rows = parsed.transactions
    .filter((t) => typeof t.amount === 'number' && t.amount > 0)
    .map((t) => ({
      amount: t.amount as number,
      category:
        (t.categoryName && byName.get(t.categoryName)) ||
        (t.category && byId.has(t.category) ? t.category : '') ||
        fallback,
      note: t.note ?? '',
      created_at: t.created_at ?? new Date().toISOString(),
    }))

  await dbImportTransactions(rows)
}
