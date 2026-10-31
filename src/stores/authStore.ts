import { create } from 'zustand'
import type { AuthUser } from '@/domain/account'

type AuthState = {
  /** off = accounts not configured, loading = waiting for Firebase, out / in = signed out / in */
  status: 'off' | 'loading' | 'out' | 'in'
  user: AuthUser | null
  /** Set when a sign-in attempt failed (not when the user simply closed the popup). */
  signInFailed: boolean
  /** Set when saving to the account failed; trails still work on this device. */
  syncFailed: boolean
}

export const useAuth = create<AuthState>()(() => ({
  status: 'off',
  user: null,
  signInFailed: false,
  syncFailed: false,
}))
