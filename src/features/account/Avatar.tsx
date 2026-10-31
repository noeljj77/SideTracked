import type { AuthUser } from '@/domain/account'
import styles from './Avatar.module.css'

/** Google profile photo, or the first letter of the name if there is none. */
export function Avatar({ user, size }: { user: AuthUser; size: number }) {
  const box = { width: size, height: size, fontSize: size * 0.55 }
  return user.photo ? (
    <img className={styles.avatar} style={box} src={user.photo} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className={styles.avatar} style={box} aria-hidden="true">
      {user.name.charAt(0).toUpperCase()}
    </span>
  )
}
