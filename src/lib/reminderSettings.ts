import { dbUpdateReminders, getState } from './store'
import type { ReminderSettings } from './types'

export function getReminderSettings(): ReminderSettings {
  return getState().reminders
}

/**
 * Optimistic: the mirror updates immediately so switches feel instant, and the
 * write is sent to Supabase in the background.
 */
export function updateReminderSettings(patch: Partial<ReminderSettings>): ReminderSettings {
  void dbUpdateReminders(patch)
  return { ...getState().reminders, ...patch }
}
