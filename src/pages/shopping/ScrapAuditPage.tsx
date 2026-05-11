import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import { shoppingApi, type ScrapAuditDto } from '../../api/shopping'
import styles from './shopping.module.css'

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function ScrapAuditPage() {
  const { showSuccess, showError } = useNotification()
  const [rows, setRows] = useState<ScrapAuditDto[]>([])
  const [dateFilter, setDateFilter] = useState<string>('')

  const load = (date?: string) => {
    shoppingApi.getScrapAudits(date || undefined)
      .then((r) => setRows(r.data))
      .catch(() => showError('Failed to load audits'))
  }

  useEffect(() => load(dateFilter || undefined), [dateFilter])

  const setToday = () => {
    const d = toDateStr(new Date())
    setDateFilter(d)
  }

  const setYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    setDateFilter(toDateStr(d))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this audit entry?')) return
    try {
      await shoppingApi.deleteScrapAudit(id)
      showSuccess('Deleted')
      load(dateFilter || undefined)
    } catch {
      showError('Failed to delete')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.dateButtons}>
          <Button variant="secondary" size="sm" onClick={setToday}>Today</Button>
          <Button variant="secondary" size="sm" onClick={setYesterday}>Yesterday</Button>
          <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>All</Button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Date:
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', padding: '4px 8px' }}
          />
        </label>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product Config</th>
              <th>Saved Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No audit entries.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.date ?? '—'}</td>
                <td>{r.productDetails ?? '—'}</td>
                <td style={{ fontWeight: 600 }}>{r.savedProducts}</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
