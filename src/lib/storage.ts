import { getUserId } from './user'
import type { Transaction } from './types'

const TX_KEY = 'money.transactions'

/**
 * Phase 1-2 data layer: transactions live in localStorage, keyed by the same
 * shape the eventual Supabase `transactions` table will use, so every read
 * here is already scoped to the current anonymous user_id.
 */
function readAll(): Transaction[] {
  try {
    const raw = localStorage.getItem(TX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Transaction[]
  } catch {
    return []
  }
}

function writeAll(txs: Transaction[]) {
  localStorage.setItem(TX_KEY, JSON.stringify(txs))
}

export function listTransactions(): Transaction[] {
  const userId = getUserId()
  return readAll()
    .filter((t) => t.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function addTransaction(input: {
  amount: number
  category: string
  note?: string
  created_at?: string
}): Transaction {
  const now = new Date().toISOString()
  const tx: Transaction = {
    id: crypto.randomUUID(),
    user_id: getUserId(),
    amount: input.amount,
    category: input.category,
    note: input.note ?? '',
    created_at: input.created_at ?? now,
    updated_at: now,
  }
  const all = readAll()
  all.push(tx)
  writeAll(all)
  return tx
}

export function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, 'amount' | 'category' | 'note'>>,
): void {
  const userId = getUserId()
  const all = readAll()
  const idx = all.findIndex((t) => t.id === id && t.user_id === userId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() }
  writeAll(all)
}

export function deleteTransaction(id: string): void {
  const userId = getUserId()
  const all = readAll().filter((t) => !(t.id === id && t.user_id === userId))
  writeAll(all)
}

export function exportJSON(): string {
  return JSON.stringify(
    { userId: getUserId(), transactions: listTransactions() },
    null,
    2,
  )
}

export function exportCSV(): string {
  const rows = [['date', 'category', 'amount', 'note']]
  for (const t of listTransactions()) {
    rows.push([t.created_at, t.category, String(t.amount), t.note.replace(/[\n,]/g, ' ')])
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function importData(json: string): void {
  const parsed = JSON.parse(json) as { transactions?: Transaction[] }
  if (!Array.isArray(parsed.transactions)) throw new Error('invalid file')
  const userId = getUserId()
  const others = readAll().filter((t) => t.user_id !== userId)
  const incoming = parsed.transactions.map((t) => ({ ...t, user_id: userId }))
  writeAll([...others, ...incoming])
}
