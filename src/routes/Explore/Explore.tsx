import { Link, useParams } from 'react-router-dom'
import styles from './Explore.module.css'

export function Explore() {
  const { topic = '' } = useParams()

  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        SideTracked
      </Link>
      <h1 className={styles.title}>{topic}</h1>
    </main>
  )
}
