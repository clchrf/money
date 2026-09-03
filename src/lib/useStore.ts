import { useSyncExternalStore } from 'react'
import { getState, subscribe } from './store'

/**
 * Subscribes a component to the data mirror. The returned state object is
 * replaced on every write, so passing it into a useMemo dependency list is
 * enough to recompute derived views after any change.
 */
export function useStore() {
  return useSyncExternalStore(subscribe, getState)
}
