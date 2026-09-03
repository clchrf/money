import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** False when the app is built without Supabase credentials. */
export const isConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null

/**
 * Every visitor gets a real Supabase identity without ever registering:
 * an anonymous sign-in yields a genuine auth.uid(), which every RLS policy
 * checks against. The session persists in localStorage, so returning to the
 * app keeps the same account and therefore the same data.
 *
 * Guarded against concurrent callers (React Strict Mode's double effect
 * invocation, or two tabs opened on the very first visit): without this,
 * each caller can independently see "no session yet" and each call
 * signInAnonymously(), minting two distinct accounts where only one should
 * exist. Every concurrent call instead shares the same in-flight promise.
 */
let sessionPromise: Promise<string> | null = null

export async function ensureSession(): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (sessionPromise) return sessionPromise

  const client = supabase
  sessionPromise = (async () => {
    const { data: existing } = await client.auth.getSession()
    if (existing.session?.user) return existing.session.user.id

    const { data, error } = await client.auth.signInAnonymously()
    if (error) {
      sessionPromise = null // let a later call retry after a failure
      throw error
    }
    if (!data.user) {
      sessionPromise = null
      throw new Error('Anonymous sign-in returned no user')
    }
    return data.user.id
  })()

  return sessionPromise
}
