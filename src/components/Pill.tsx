import type { ButtonHTMLAttributes } from 'react'
import styles from './Pill.module.css'

export function Pill(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={styles.pill} {...props} />
}
