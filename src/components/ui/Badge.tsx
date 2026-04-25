import { ReactNode } from 'react'
import styles from './Badge.module.css'

type Color = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  children: ReactNode
  color?: Color
}

export function Badge({ children, color = 'neutral' }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[color]}`}>{children}</span>
}
