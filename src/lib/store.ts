import { supabase, ensureSession } from './db'
import type { Budget, Category, FixedExpense, ReminderSettings, Transaction } from './types'

/**
 * In-memory mirror of the user's data.
 *
 * A personal ledger is small, so the whole account is loaded once at start-up
 * and kept in memory. Components then read synchronously — which keeps every
 * existing call site unchanged — while writes go to Supabase and update the
 * mirror optimistically, so recording stays instant.
 */
interface State {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  userId: string | null
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
  fixedExpenses: FixedExpense[]
  reminders: ReminderSettings
}

const DEFAULT_REMINDERS: ReminderSettings = {
  email: '',
  noon_enabled: false,
  evening_enabled: false,
  noon_time: '12:00',
  evening_time: '19:00',
  monthly_report_enabled: false,
}

let state: State = {
  status: 'loading',
  error: null,
  userId: null,
  categories: [],
  transactions: [],
  budgets: [],
  fixedExpenses: [],
  reminders: DEFAULT_REMINDERS,
}

const listeners = new Set<() => void>()

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getState(): State {
  return state
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

// ---------------------------------------------------------------
// Row mapping — the database uses snake_case and category_id; the UI keeps
// its own shape, so the translation lives here and nowhere else.
// ---------------------------------------------------------------
type Row = Record<string, unknown>

const toCategory = (r: Row): Category => ({
  id: r.id as string,
  label: r.name as string,
  icon: r.icon as string,
  sortOrder: r.sort_order as number,
})

const toTransaction = (r: Row): Transaction => ({
  id: r.id as string,
  user_id: r.user_id as string,
  amount: Number(r.amount),
  category: (r.category_id as string) ?? '',
  note: (r.note as string) ?? '',
  created_at: r.created_at as string,
  updated_at: r.updated_at as string,
})

const toBudget = (r: Row): Budget => ({
  id: r.id as string,
  user_id: r.user_id as string,
  category: (r.category_id as string) ?? null,
  amount: Number(r.amount),
  period: r.period as Budget['period'],
})

const toFixedExpense = (r: Row): FixedExpense => ({
  id: r.id as string,
  user_id: r.user_id as string,
  name: r.name as string,
  amount: Number(r.amount),
  category: (r.category_id as string) ?? '',
  frequency: r.frequency as FixedExpense['frequency'],
  next_date: r.next_date as string,
  note: (r.note as string) ?? '',
  enabled: r.enabled as boolean,
  auto_record: r.auto_record as boolean,
  reminder_enabled: r.reminder_enabled as boolean,
})

function db() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// ---------------------------------------------------------------
// Load
// ---------------------------------------------------------------
/**
 * Guarded the same way as ensureSession(): a concurrent caller (Strict
 * Mode's double effect invocation, chiefly) shares this in-flight load
 * rather than issuing a second, redundant round of queries.
 */
let loadPromise: Promise<void> | null = null

export function loadAll(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = doLoadAll().finally(() => {
    loadPromise = null
  })
  return loadPromise
}

async function doLoadAll(): Promise<void> {
  try {
    const userId = await ensureSession()
    const client = db()

    const [cats, txs, buds, fixed, rem] = await Promise.all([
      client.from('categories').select('*').order('sort_order'),
      client.from('transactions').select('*').order('created_at', { ascending: false }),
      client.from('budgets').select('*'),
      client.from('fixed_expenses').select('*').order('next_date'),
      client.from('reminder_settings').select('*').maybeSingle(),
    ])

    const firstError = cats.error || txs.error || buds.error || fixed.error || rem.error
    if (firstError) throw firstError

    set({
      status: 'ready',
      error: null,
      userId,
      categories: (cats.data ?? []).map(toCategory),
      transactions: (txs.data ?? []).map(toTransaction),
      budgets: (buds.data ?? []).map(toBudget),
      fixedExpenses: (fixed.data ?? []).map(toFixedExpense),
      reminders: rem.data ? { ...DEFAULT_REMINDERS, ...(rem.data as Partial<ReminderSettings>) } : DEFAULT_REMINDERS,
    })
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
  }
}

/** Re-read one table after a write, keeping the mirror authoritative. */
async function refresh(table: 'categories' | 'transactions' | 'budgets' | 'fixed_expenses') {
  const client = db()
  if (table === 'categories') {
    const { data } = await client.from('categories').select('*').order('sort_order')
    set({ categories: (data ?? []).map(toCategory) })
  } else if (table === 'transactions') {
    const { data } = await client.from('transactions').select('*').order('created_at', { ascending: false })
    set({ transactions: (data ?? []).map(toTransaction) })
  } else if (table === 'budgets') {
    const { data } = await client.from('budgets').select('*')
    set({ budgets: (data ?? []).map(toBudget) })
  } else {
    const { data } = await client.from('fixed_expenses').select('*').order('next_date')
    set({ fixedExpenses: (data ?? []).map(toFixedExpense) })
  }
}

// ---------------------------------------------------------------
// Writes
// ---------------------------------------------------------------
export async function dbAddTransaction(input: {
  amount: number
  category: string
  note?: string
  created_at?: string
}) {
  const row: Row = { amount: input.amount, category_id: input.category || null, note: input.note ?? '' }
  if (input.created_at) row.created_at = input.created_at
  const { error } = await db().from('transactions').insert(row)
  if (error) throw error
  await refresh('transactions')
}

export async function dbUpdateTransaction(
  id: string,
  patch: { amount?: number; category?: string; note?: string; created_at?: string },
) {
  const row: Row = {}
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.category !== undefined) row.category_id = patch.category || null
  if (patch.note !== undefined) row.note = patch.note
  // created_at doubles as "the date this expense happened" (RecordPage's own
  // date picker already writes it on create) — there is no separate
  // transaction-date column, so editing the date updates this field.
  // updated_at is untouched here; the DB trigger sets it to now() on any
  // UPDATE regardless, so "row last modified" and "expense happened on"
  // stay independently correct.
  if (patch.created_at !== undefined) row.created_at = patch.created_at
  const { error } = await db().from('transactions').update(row).eq('id', id)
  if (error) throw error
  await refresh('transactions')
}

export async function dbDeleteTransaction(id: string) {
  const { error } = await db().from('transactions').delete().eq('id', id)
  if (error) throw error
  await refresh('transactions')
}

export async function dbAddCategory(input: { label: string; icon: string }) {
  const maxOrder = state.categories.reduce((m, c) => Math.max(m, c.sortOrder), -1)
  const { error } = await db()
    .from('categories')
    .insert({ name: input.label, icon: input.icon, sort_order: maxOrder + 1 })
  if (error) throw error
  await refresh('categories')
}

export async function dbUpdateCategory(id: string, patch: { label?: string; icon?: string }) {
  const row: Row = {}
  if (patch.label !== undefined) row.name = patch.label
  if (patch.icon !== undefined) row.icon = patch.icon
  const { error } = await db().from('categories').update(row).eq('id', id)
  if (error) throw error
  await refresh('categories')
}

export async function dbDeleteCategory(id: string) {
  const { error } = await db().from('categories').delete().eq('id', id)
  if (error) throw error
  await Promise.all([refresh('categories'), refresh('transactions'), refresh('budgets')])
}

export async function dbMoveCategory(id: string, direction: 'up' | 'down') {
  const ordered = [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const i = ordered.findIndex((c) => c.id === id)
  const j = direction === 'up' ? i - 1 : i + 1
  if (i === -1 || j < 0 || j >= ordered.length) return
  const client = db()
  const [a, b] = [ordered[i], ordered[j]]
  const { error } = await client.from('categories').upsert([
    { id: a.id, sort_order: b.sortOrder },
    { id: b.id, sort_order: a.sortOrder },
  ])
  if (error) throw error
  await refresh('categories')
}

export async function dbSetBudget(category: string | null, amount: number, period: Budget['period']) {
  const existing = state.budgets.find((b) => b.category === category)
  const client = db()
  const { error } = existing
    ? await client.from('budgets').update({ amount, period }).eq('id', existing.id)
    : await client.from('budgets').insert({ category_id: category, amount, period })
  if (error) throw error
  await refresh('budgets')
}

export async function dbDeleteBudget(category: string) {
  const existing = state.budgets.find((b) => b.category === category)
  if (!existing) return
  const { error } = await db().from('budgets').delete().eq('id', existing.id)
  if (error) throw error
  await refresh('budgets')
}

export async function dbAddFixedExpense(input: Omit<FixedExpense, 'id' | 'user_id' | 'enabled'>) {
  const { error } = await db().from('fixed_expenses').insert({
    name: input.name,
    amount: input.amount,
    category_id: input.category || null,
    frequency: input.frequency,
    next_date: input.next_date,
    note: input.note,
    auto_record: input.auto_record,
    reminder_enabled: input.reminder_enabled,
  })
  if (error) throw error
  await refresh('fixed_expenses')
}

export async function dbUpdateFixedExpense(id: string, patch: Partial<Omit<FixedExpense, 'id' | 'user_id'>>) {
  const row: Row = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.category !== undefined) row.category_id = patch.category || null
  if (patch.frequency !== undefined) row.frequency = patch.frequency
  if (patch.next_date !== undefined) row.next_date = patch.next_date
  if (patch.note !== undefined) row.note = patch.note
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  if (patch.auto_record !== undefined) row.auto_record = patch.auto_record
  if (patch.reminder_enabled !== undefined) row.reminder_enabled = patch.reminder_enabled
  const { error } = await db().from('fixed_expenses').update(row).eq('id', id)
  if (error) throw error
  await refresh('fixed_expenses')
}

export async function dbDeleteFixedExpense(id: string) {
  const { error } = await db().from('fixed_expenses').delete().eq('id', id)
  if (error) throw error
  await refresh('fixed_expenses')
}

export async function dbUpdateReminders(patch: Partial<ReminderSettings>) {
  const next = { ...state.reminders, ...patch }
  set({ reminders: next })
  const { error } = await db()
    .from('reminder_settings')
    .upsert({ user_id: state.userId, ...next }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Bulk insert used by data import. */
export async function dbImportTransactions(rows: { amount: number; category: string; note: string; created_at: string }[]) {
  if (rows.length === 0) return
  const { error } = await db()
    .from('transactions')
    .insert(rows.map((r) => ({ amount: r.amount, category_id: r.category || null, note: r.note, created_at: r.created_at })))
  if (error) throw error
  await refresh('transactions')
}
