export interface Category {
  id: string
  label: string
  icon: string
  sortOrder: number
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  category: string
  note: string
  created_at: string
  updated_at: string
}

export type BudgetPeriod = 'monthly' | 'weekly'

export interface Budget {
  id: string
  user_id: string
  category: string | null // null = total budget
  amount: number
  period: BudgetPeriod
}

export type FixedFrequency = 'monthly' | 'weekly'

export interface FixedExpense {
  id: string
  user_id: string
  name: string
  amount: number
  category: string
  frequency: FixedFrequency
  next_date: string // yyyy-mm-dd
  note: string
  enabled: boolean
  auto_record: boolean
  reminder_enabled: boolean
}

export interface ReminderSettings {
  email: string
  noon_enabled: boolean
  evening_enabled: boolean
  noon_time: string
  evening_time: string
  monthly_report_enabled: boolean
}

export const DEFAULT_CATEGORIES: Omit<Category, 'sortOrder'>[] = [
  { id: 'food', label: '餐飲', icon: '🍜' },
  { id: 'transport', label: '交通', icon: '🚇' },
  { id: 'shopping', label: '購物', icon: '🛍️' },
  { id: 'life', label: '生活', icon: '🏠' },
  { id: 'entertainment', label: '娛樂', icon: '🎮' },
  { id: 'medical', label: '醫療', icon: '💊' },
  { id: 'education', label: '教育', icon: '📚' },
  { id: 'other', label: '其他', icon: '📦' },
]

export const FALLBACK_CATEGORY: Category = { id: '', label: '其他', icon: '📦', sortOrder: 999 }
