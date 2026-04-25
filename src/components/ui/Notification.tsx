import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import styles from './Notification.module.css'

type Variant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  variant: Variant
}

interface NotificationContextValue {
  showSuccess: (msg: string) => void
  showError: (msg: string) => void
  showWarning: (msg: string) => void
  showInfo: (msg: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

let counter = 0

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((message: string, variant: Variant) => {
    const id = ++counter
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <NotificationContext.Provider value={{
      showSuccess: (msg) => add(msg, 'success'),
      showError: (msg) => add(msg, 'error'),
      showWarning: (msg) => add(msg, 'warning'),
      showInfo: (msg) => add(msg, 'info'),
    }}>
      {children}
      <div className={styles.container}>
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.variant]}`}>
            <span>{t.message}</span>
            <button className={styles.closeBtn} onClick={() => dismiss(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used inside NotificationProvider')
  return ctx
}
