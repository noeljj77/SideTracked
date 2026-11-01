import { Link } from 'react-router-dom'
import styles from './NotFound.module.css'

/** Any address the app does not know: say so plainly and lead back to the start. */
export function NotFound() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>That page isn&rsquo;t on the board.</h1>
      <p className={styles.lede}>
        The address doesn&rsquo;t lead anywhere. Start again from the first thread.
      </p>
      <Link to="/" className={styles.go}>
        Back to the start
      </Link>
    </main>
  )
}
