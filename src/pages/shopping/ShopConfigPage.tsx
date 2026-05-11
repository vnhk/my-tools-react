import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { useNotification } from '../../components/ui/Notification'
import { shoppingApi, type ShopConfigDto } from '../../api/shopping'
import styles from './shopping.module.css'

const EMPTY: ShopConfigDto = { shopName: '', baseUrl: null }

export function ShopConfigPage() {
  const { showSuccess, showError } = useNotification()
  const [rows, setRows] = useState<ShopConfigDto[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ShopConfigDto>(EMPTY)
  const [loading, setLoading] = useState(false)

  const load = () => {
    shoppingApi.getShopConfigs()
      .then((r) => setRows(r.data))
      .catch(() => showError('Failed to load shops'))
  }

  useEffect(load, [])

  const openCreate = () => { setForm({ ...EMPTY }); setDialogOpen(true) }
  const openEdit = (row: ShopConfigDto) => { setForm({ ...row }); setDialogOpen(true) }

  const handleSave = async () => {
    if (!form.shopName) { showError('Shop name is required'); return }
    setLoading(true)
    try {
      if (form.id) {
        await shoppingApi.updateShopConfig(form.id, form)
      } else {
        await shoppingApi.createShopConfig(form)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this shop?')) return
    try {
      await shoppingApi.deleteShopConfig(id)
      showSuccess('Deleted')
      load()
    } catch {
      showError('Failed to delete')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Button variant="primary" size="sm" onClick={openCreate}>+ New Shop</Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Shop Name</th>
              <th>Base URL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No shops configured.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td style={{ fontWeight: 600 }}>{r.shopName}</td>
                <td><a href={r.baseUrl ?? '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>{r.baseUrl ?? '—'}</a></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(r.id!)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={dialogOpen}
        title={form.id ? 'Edit Shop' : 'New Shop'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel={loading ? 'Saving...' : 'Save'}
      >
        <div className={styles.formGroup}>
          <div className={styles.formField}>
            <label>Shop Name *</label>
            <input value={form.shopName} onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))} />
          </div>
          <div className={styles.formField}>
            <label>Base URL</label>
            <input value={form.baseUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value || null }))} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
