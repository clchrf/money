import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY, type Category } from './types'

const KEY = 'money.categories'
const LAST_KEY = 'money.lastCategory'

function seedIfEmpty(): Category[] {
  const seeded = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i }))
  localStorage.setItem(KEY, JSON.stringify(seeded))
  return seeded
}

function readAll(): Category[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedIfEmpty()
    const parsed = JSON.parse(raw) as Category[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seedIfEmpty()
    return parsed
  } catch {
    return seedIfEmpty()
  }
}

function writeAll(cats: Category[]) {
  localStorage.setItem(KEY, JSON.stringify(cats))
}

export function listCategories(): Category[] {
  return readAll().sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getCategory(id: string): Category {
  return readAll().find((c) => c.id === id) ?? { ...FALLBACK_CATEGORY, id }
}

/**
 * The record screen always shows a concrete category, so entry is one tap
 * (amount → save). Defaults to the last one used, else the first in the list.
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

export function addCategory(input: { label: string; icon: string }): Category {
  const all = readAll()
  const maxOrder = all.reduce((m, c) => Math.max(m, c.sortOrder), -1)
  const cat: Category = {
    id: crypto.randomUUID(),
    label: input.label,
    icon: input.icon,
    sortOrder: maxOrder + 1,
  }
  writeAll([...all, cat])
  return cat
}

export function updateCategory(id: string, patch: Partial<Pick<Category, 'label' | 'icon'>>) {
  const all = readAll()
  const idx = all.findIndex((c) => c.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...patch }
  writeAll(all)
}

export function deleteCategory(id: string) {
  writeAll(readAll().filter((c) => c.id !== id))
}

export function moveCategory(id: string, direction: 'up' | 'down') {
  const all = listCategories()
  const idx = all.findIndex((c) => c.id === id)
  if (idx === -1) return
  const swapWith = direction === 'up' ? idx - 1 : idx + 1
  if (swapWith < 0 || swapWith >= all.length) return
  const a = all[idx]
  const b = all[swapWith]
  const tmp = a.sortOrder
  a.sortOrder = b.sortOrder
  b.sortOrder = tmp
  writeAll(all)
}
