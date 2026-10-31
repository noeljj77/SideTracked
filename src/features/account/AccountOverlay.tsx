import { Overlay } from '@/components/Overlay'
import { useAuth } from '@/stores/authStore'
import { useUi } from '@/stores/uiStore'
import { Avatar } from './Avatar'
import { signInWithGoogle, signOutUser } from './account'
import styles from './AccountOverlay.module.css'

export function AccountOverlay() {
  const { status, user, signInFailed, syncFailed } = useAuth()
  const { open, close } = useUi()

  return (
    <Overlay label="Account">
      {status === 'in' && user ? (
        <div className={styles.body}>
          <div className={styles.who}>
            <Avatar user={user} size={44} />
            <div>
              <p className={styles.name}>{user.name}</p>
              <p className={styles.email}>{user.email}</p>
            </div>
          </div>
          <p className={styles.note}>Your saved trails sync to this account on every device where you sign in.</p>
          {syncFailed && <p className={styles.warn}>Couldn't save to your account just now. Your trails are still kept on this device.</p>}
          <div className={styles.actions}>
            <button className={styles.button} onClick={() => open('trails')}>
              Your trails
            </button>
            <button
              className={styles.button}
              onClick={() => {
                void signOutUser()
                close()
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <h2 className={styles.title}>Sign in</h2>
          {signInFailed && <p className={styles.warn}>Couldn't sign in. Check that pop-ups are allowed, then try again.</p>}
          <p className={styles.note}>Sign in with Google to keep your trails across devices.</p>
          <div className={styles.actions}>
            <button className={styles.button} onClick={() => void signInWithGoogle()}>
              Sign in with Google
            </button>
          </div>
        </div>
      )}
    </Overlay>
  )
}
