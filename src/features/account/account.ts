import { isFirebaseConfigured } from '@/api/firebase/config'
import { useAuth } from '@/stores/authStore'
import { useUi } from '@/stores/uiStore'
import { startSync } from './sync'

const loadFirebase = () => import('@/api/firebase/firebase')

let started = false
let stopSync: (() => void) | undefined

/** Call once at startup. Watches the Firebase session and keeps trails synced while signed in. */
export function initAccount() {
  if (started) return
  started = true
  if (!isFirebaseConfigured) return // status stays 'off'

  useAuth.setState({ status: 'loading' })
  loadFirebase()
    .then((fb) =>
      fb.watchAuth((user) => {
        stopSync?.()
        stopSync = undefined
        if (!user) return useAuth.setState({ status: 'out', user: null })
        useAuth.setState({ status: 'in', user, syncFailed: false })
        stopSync = startSync(user.uid, fb.trailsRepo, () => useAuth.setState({ syncFailed: true }))
      }),
    )
    .catch(() => useAuth.setState({ status: 'out' }))
}

const USER_CANCELLED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

export async function signInWithGoogle() {
  useAuth.setState({ signInFailed: false })
  try {
    await (await loadFirebase()).signIn()
  } catch (err) {
    const code = (err as { code?: string }).code ?? ''
    if (USER_CANCELLED.includes(code)) return
    useAuth.setState({ signInFailed: true })
    useUi.getState().open('account')
  }
}

export async function signOutUser() {
  await (await loadFirebase()).signOutUser()
}
