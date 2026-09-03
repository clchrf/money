import {
  dbAddCategory,
  dbDeleteCategory,
  dbMoveCategory,
  dbUpdateCategory,
  getState,
} from './store'
import { FALLBACK_CATEGORY, type Category } from './types'

const LAST_KEY = 'money.lastCategory'

export function listCategories(): Category[] {
  return [...getState().categories].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getCategory(id: string): Category {
  return getState().categories.find((c) => c.id === id) ?? { ...FALLBACK_CATEGORY, id }
}

/**
 * The record screen always shows a concrete category, so entry is one tap
 * (amount → save). Defaults to the last one used, else the first in the list.
 * The preference is per-device, so it stays in localStorage.
 */
export function getDefaultCategoryId(): string {
  const all = listCategories()
  const last = localStorage.getItem(LAST_KEY)
  if (last && all.some((c) => c.id === last)) return last
  return all[0]?.id ?? ''
}

export function setLastCategoryId(id: string) {
  localStorage.setItem(LAST_KEY, id)
}

export const addCategory = (input: { label: string; icon: string }) => dbAddCategory(input)
export const updateCategory = (id: string, patch: Partial<Pick<Category, 'label' | 'icon'>>) =>
  dbUpdateCategory(id, patch)
export const deleteCategory = (id: string) => dbDeleteCategory(id)
export const moveCategory = (id: string, direction: 'up' | 'down') => dbMoveCategory(id, direction)
