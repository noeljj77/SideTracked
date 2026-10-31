import { Pill } from '@/components/Pill'
import { useAuth } from '@/stores/authStore'
import { useUi } from '@/stores/uiStore'
import { Avatar } from './Avatar'
import { signInWithGoogle } from './account'
import styles from './AccountPill.module.css'

/** "Sign in" when signed out, your avatar when signed in. Renders nothing if accounts are not set up. */
export function AccountPill() {
  const { status, user } = useAuth()
  const open = useUi((s) => s.open)

  if (status === 'out') return <Pill onClick={() => void signInWithGoogle()}>Sign in</Pill>
  if (status === 'in' && user) {
    return (
      <Pill onClick={() => open('account')} aria-label={`Account: ${user.name}`}>
        <Avatar user={user} size={18} />
        <span className={styles.name}>{user.name.split(' ')[0]}</span>
      </Pill>
    )
  }
  return null
}
