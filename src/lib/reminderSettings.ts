import type { ReminderSettings } from './types'

const KEY = 'money.reminderSettings'

const DEFAULTS: ReminderSettings = {
  email: '',
  noon_enabled: false,
  evening_enabled: false,
  noon_time: '12:00',
  evening_time: '19:00',
  monthly_report_enabled: false,
}

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReminderSettings>) }
  } catch {
    return DEFAULTS
  }
}

export function updateReminderSettings(patch: Partial<ReminderSettings>) {
  const next = { ...getReminderSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
