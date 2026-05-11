import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { useNotification } from '../../components/ui/Notification'
import { shoppingApi, type ProductConfigDto, type ShopConfigDto } from '../../api/shopping'
import styles from './shopping.module.css'

const EMPTY: ProductConfigDto = {
  name: '', url: null, minPrice: null, maxPrice: null,
  scrapTime: null, categories: [], shopId: null, shopName: null,
}

export function ProductConfigPage() {
  const { showSuccess, showError } = useNotification()
  const [rows, setRows] = useState<ProductConfigDto[]>([])
  const [shops, setShops] = useState<ShopConfigDto[]>([])
  const [filterShopId, setFilterShopId] = useState<number | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ProductConfigDto>(EMPTY)
  const [loading, setLoading] = useState(false)

  const load = () => {
    shoppingApi.getProductConfigs(filterShopId)
      .then((r) => setRows(r.data))
      .catch(() => showError('Failed to load configs'))
  }

  useEffect(() => {
    shoppingApi.getShopConfigs()
      .then((r) => setShops(r.data))
      .catch(() => {})
  }, [])

  useEffect(load, [filterShopId])

  const openCreate = () => { setForm({ ...EMPTY }); setDialogOpen(true) }
  const openEdit = (row: ProductConfigDto) => { setForm({ ...row }); setDialogOpen(true) }

  const handleSave = async () => {
    if (!form.name) { showError('Name is required'); return }
    setLoading(true)
    try {
      if (form.id) {
        await shoppingApi.updateProductConfig(form.id, form)
      } else {
        await shoppingApi.createProductConfig(form)
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
    if (!confirm('Delete this config?')) return
    try {
      await shoppingApi.deleteProductConfig(id)
      showSuccess('Deleted')
      load()
    } catch {
      showError('Failed to delete')
    }
  }

  const set = (k: keyof ProductConfigDto, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Filter by shop:
          <select
            value={filterShopId ?? ''}
            onChange={(e) => setFilterShopId(e.target.value ? Number(e.target.value) : undefined)}
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', padding: '4px 8px' }}
          >
            <option value="">All shops</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.shopName}</option>)}
          </select>
        </label>
        <Button variant="primary" size="sm" onClick={openCreate}>+ New Config</Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Shop</th>
              <th>Scrap Time</th>
              <th>Price Range</th>
              <th>Categories</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No configs.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.shopName ?? '—'}</td>
                <td>{r.scrapTime ?? '—'}</td>
                <td>{r.minPrice ?? '—'} – {r.maxPrice ?? '—'}</td>
                <td>{r.categories?.join(', ') || '—'}</td>
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
        title={form.id ? 'Edit Config' : 'New Config'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel={loading ? 'Saving...' : 'Save'}
      >
        <div className={styles.formGroup}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className={styles.formField}>
              <label>Shop</label>
              <select value={form.shopId ?? ''} onChange={(e) => set('shopId', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— Select —</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.shopName}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.formField}>
            <label>URL</label>
            <input value={form.url ?? ''} onChange={(e) => set('url', e.target.value || null)} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Min Price</label>
              <input type="number" value={form.minPrice ?? ''} onChange={(e) => set('minPrice', e.target.value === '' ? null : Number(e.target.value))} />
            </div>
            <div className={styles.formField}>
              <label>Max Price</label>
              <input type="number" value={form.maxPrice ?? ''} onChange={(e) => set('maxPrice', e.target.value === '' ? null : Number(e.target.value))} />
            </div>
            <div className={styles.formField}>
              <label>Scrap Time (HH:MM)</label>
              <input value={form.scrapTime ?? ''} onChange={(e) => set('scrapTime', e.target.value || null)} placeholder="09:00" />
            </div>
          </div>
          <div className={styles.formField}>
            <label>Categories (comma-separated)</label>
            <input
              value={form.categories?.join(', ') ?? ''}
              onChange={(e) => set('categories', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
