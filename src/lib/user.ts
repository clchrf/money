const USER_ID_KEY = 'money.userId'

/**
 * Every browser gets one anonymous user id on first use, persisted locally.
 * All data is scoped to this id — this is the client-side half of the
 * user/RLS boundary the backend is expected to enforce.
 */
export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}
