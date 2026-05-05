import { ReactNode, useEffect, useRef } from 'react'
import { Button } from './Button'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  onConfirm?: () => void
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  footer?: ReactNode
  children: ReactNode
  width?: string
}

export function Dialog({
  open,
  title,
  onClose,
  onConfirm,
  confirmLabel = 'Save',
  confirmVariant = 'primary',
  footer,
  children,
  width = 'min(90vw, 720px)',
}: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.backdrop}
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className={styles.dialog} style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>{children}</div>
        {(footer ?? onConfirm) && (
          <div className={styles.footer}>
            {footer ?? (
              <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
