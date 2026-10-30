import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

export function Landing() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const topic = query.trim()
    if (topic) navigate(`/explore/${encodeURIComponent(topic)}`)
  }

  return (
    <main className={styles.page}>
      <p className={styles.brand}>SideTracked</p>
      <h1 className={styles.title}>
        One thing leads <em>to another.</em>
      </h1>
      <form onSubmit={onSubmit} className={styles.form}>
        <input
          className={styles.input}
          aria-label="Topic"
          placeholder="Type any topic: octopus, jazz, Byzantium…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
    </main>
  )
}
