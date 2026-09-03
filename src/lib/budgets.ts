import { getUserId } from './user'
import { listTransactions } from './storage'
import type { Budget, BudgetPeriod } from './types'

const KEY = 'money.budgets'

function readAll(): Budget[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as Budget[]
  } catch {
    return []
  }
}

function writeAll(all: Budget[]) {
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function listBudgets(): Budget[] {
  const userId = getUserId()
  return readAll().filter((b) => b.user_id === userId)
}

export function getTotalBudget(): Budget | undefined {
  return listBudgets().find((b) => b.category === null)
}

export function getCategoryBudget(categoryId: string): Budget | undefined {
  return listBudgets().find((b) => b.category === categoryId)
}

function upsert(category: string | null, amount: number, period: BudgetPeriod) {
  const userId = getUserId()
  const all = readAll()
  const idx = all.findIndex((b) => b.user_id === userId && b.category === category)
  if (idx === -1) {
    all.push({ id: crypto.randomUUID(), user_id: userId, category, amount, period })
  } else {
    all[idx] = { ...all[idx], amount, period }
  }
  writeAll(all)
}

export function setTotalBudget(amount: number, period: BudgetPeriod) {
  upsert(null, amount, period)
}

export function setCategoryBudget(categoryId: string, amount: number, period: BudgetPeriod) {
  upsert(categoryId, amount, period)
}

export function deleteCategoryBudget(categoryId: string) {
  const userId = getUserId()
  writeAll(readAll().filter((b) => !(b.user_id === userId && b.category === categoryId)))
}

/** Start/end (inclusive) of the period containing `ref`. */
export function getPeriodRange(period: BudgetPeriod, ref: Date = new Date()): { start: Date; end: Date } {
  if (period === 'monthly') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }
  // weekly: Monday–Sunday
  const day = ref.getDay() === 0 ? 7 : ref.getDay()
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - (day - 1))
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
  return { start, end }
}

export function computeUsed(categoryId: string | null, period: BudgetPeriod, ref: Date = new Date()): number {
  const { start, end } = getPeriodRange(period, ref)
  return listTransactions()
    .filter((t) => {
      if (categoryId !== null && t.category !== categoryId) return false
      const d = new Date(t.created_at)
      return d >= start && d <= end
    })
    .reduce((sum, t) => sum + t.amount, 0)
}
