import { ReactNode } from 'react'
import styles from './SearchPanel.module.css'

// React equivalent of AbstractPageView search form helpers

interface SearchSectionProps {
  title: string
  children: ReactNode
}

export function SearchSection({ title, children }: SearchSectionProps) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

interface SearchRowProps {
  children: ReactNode
}

export function SearchRow({ children }: SearchRowProps) {
  return <div className={styles.row}>{children}</div>
}

interface SearchFieldRowProps {
  children: ReactNode
}

export function SearchFieldRow({ children }: SearchFieldRowProps) {
  return <div className={styles.fieldRow}>{children}</div>
}

interface SearchPanelProps {
  title?: ReactNode
  children: ReactNode
  actions?: ReactNode
}

export function SearchPanel({ title, children, actions }: SearchPanelProps) {
  return (
    <div className={styles.panel}>
      {title && <div className={styles.panelTitle}>{title}</div>}
      <div className={styles.form}>{children}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
