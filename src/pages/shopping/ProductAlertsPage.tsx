import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { useNotification } from '../../components/ui/Notification'
import { shoppingApi, type ProductAlertDto } from '../../api/shopping'
import styles from './shopping.module.css'

const EMPTY: ProductAlertDto = {
  name: '', priceMin: null, priceMax: null, discountMin: null, discountMax: null,
  productName: null, productCategories: [], emails: [],
}

export function ProductAlertsPage() {
  const { showSuccess, showError } = useNotification()
  const [rows, setRows] = useState<ProductAlertDto[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ProductAlertDto>(EMPTY)
  const [loading, setLoading] = useState(false)

  const load = () => {
    shoppingApi.getProductAlerts()
      .then((r) => setRows(r.data))
      .catch(() => showError('Failed to load alerts'))
  }

  useEffect(load, [])

  const openCreate = () => { setForm({ ...EMPTY }); setDialogOpen(true) }
  const openEdit = (row: ProductAlertDto) => { setForm({ ...row }); setDialogOpen(true) }

  const handleSave = async () => {
    if (!form.name) { showError('Name is required'); return }
    setLoading(true)
    try {
      if (form.id) {
        await shoppingApi.updateProductAlert(form.id, form)
      } else {
        await shoppingApi.createProductAlert(form)
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
    if (!confirm('Delete this alert?')) return
    try {
      await shoppingApi.deleteProductAlert(id)
      showSuccess('Deleted')
      load()
    } catch {
      showError('Failed to delete')
    }
  }

  const set = (k: keyof ProductAlertDto, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Button variant="primary" size="sm" onClick={openCreate}>+ New Alert</Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Product</th>
              <th>Price Range</th>
              <th>Discount Range</th>
              <th>Categories</th>
              <th>Emails</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No alerts configured.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.productName ?? '—'}</td>
                <td>{r.priceMin ?? '—'} – {r.priceMax ?? '—'}</td>
                <td>{r.discountMin ?? '—'}% – {r.discountMax ?? '—'}%</td>
                <td>{r.productCategories?.join(', ') || '—'}</td>
                <td>{r.emails?.join(', ') || '—'}</td>
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
        title={form.id ? 'Edit Alert' : 'New Alert'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel={loading ? 'Saving...' : 'Save'}
      >
        <div className={styles.formGroup}>
          <div className={styles.formRow}>
            <Field label="Name *" value={form.name} onChange={(v) => set('name', v)} />
            <Field label="Product Name" value={form.productName ?? ''} onChange={(v) => set('productName', v || null)} />
          </div>
          <div className={styles.formRow}>
            <Field label="Price Min" type="number" value={form.priceMin ?? ''} onChange={(v) => set('priceMin', v === '' ? null : Number(v))} />
            <Field label="Price Max" type="number" value={form.priceMax ?? ''} onChange={(v) => set('priceMax', v === '' ? null : Number(v))} />
            <Field label="Discount Min (%)" type="number" value={form.discountMin ?? ''} onChange={(v) => set('discountMin', v === '' ? null : Number(v))} />
            <Field label="Discount Max (%)" type="number" value={form.discountMax ?? ''} onChange={(v) => set('discountMax', v === '' ? null : Number(v))} />
          </div>
          <div className={styles.formField}>
            <label>Categories (comma-separated)</label>
            <input
              value={form.productCategories?.join(', ') ?? ''}
              onChange={(e) => set('productCategories', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            />
          </div>
          <div className={styles.formField}>
            <label>Emails (comma-separated)</label>
            <input
              value={form.emails?.join(', ') ?? ''}
              onChange={(e) => set('emails', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string
}) {
  return (
    <div className={styles.formField}>
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
