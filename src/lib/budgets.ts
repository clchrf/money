import { dbDeleteBudget, dbSetBudget, getState } from './store'
import { listTransactions } from './storage'
import type { Budget, BudgetPeriod } from './types'

export function listBudgets(): Budget[] {
  return getState().budgets
}

export function getTotalBudget(): Budget | undefined {
  return listBudgets().find((b) => b.category === null)
}

export function getCategoryBudget(categoryId: string): Budget | undefined {
  return listBudgets().find((b) => b.category === categoryId)
}

export const setTotalBudget = (amount: number, period: BudgetPeriod) => dbSetBudget(null, amount, period)
export const setCategoryBudget = (categoryId: string, amount: number, period: BudgetPeriod) =>
  dbSetBudget(categoryId, amount, period)
export const deleteCategoryBudget = (categoryId: string) => dbDeleteBudget(categoryId)

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

export function computeUsed(
  categoryId: string | null,
  period: BudgetPeriod,
  ref: Date = new Date(),
): number {
  const { start, end } = getPeriodRange(period, ref)
  return listTransactions()
    .filter((t) => {
      if (categoryId !== null && t.category !== categoryId) return false
      const d = new Date(t.created_at)
      return d >= start && d <= end
    })
    .reduce((sum, t) => sum + t.amount, 0)
}
