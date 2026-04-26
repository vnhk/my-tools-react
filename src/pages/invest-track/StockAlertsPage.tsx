import { useEffect, useState } from 'react'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { SelectField } from '../../components/fields/SelectField'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { stockAlertsApi, type StockAlert } from '../../api/investments'
import { toPage } from '../../api/crud'
import type { Column } from '../../components/table/DataTable'
import styles from './StockAlertsPage.module.css'

const COLUMNS: Column<StockAlert>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'symbol', header: 'Symbol', sortable: true },
  { key: 'exchange', header: 'Exchange', sortable: true },
  {
    key: 'config.price',
    header: 'Price',
    render: (row) => row.config ? `${row.config.operator} ${row.config.price}` : '—',
  },
  {
    key: 'config.amountOfNotifications',
    header: 'Notifications Left',
    render: (row) => row.config?.amountOfNotifications ?? '—',
  },
  {
    key: 'emails',
    header: 'Emails',
    render: (row) => row.emails.join(', ') || '—',
  },
]

const EMPTY: StockAlert & { price: number; operator: string; amountOfNotifications: number; checkIntervalMinutes: number; anotherNotificationEachPercentage: number } = {
  id: '', name: '', symbol: '', exchange: 'GPW', emails: [],
  config: null,
  price: 0, operator: '<=', amountOfNotifications: 1, checkIntervalMinutes: 60, anotherNotificationEachPercentage: 10,
}

type EditState = Partial<StockAlert> & {
  price?: number; operator?: string; amountOfNotifications?: number;
  checkIntervalMinutes?: number; anotherNotificationEachPercentage?: number;
  emailsText?: string;
}

export function StockAlertsPage() {
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'symbol', sortDir: 'asc' }, 'stock-alerts')
  const [rows, setRows] = useState<StockAlert[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<EditState>({ ...EMPTY })

  const load = () => {
    setLoading(true)
    stockAlertsApi.getAll({ page: table.page, size: table.pageSize })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize])

  const openEdit = (item: Partial<StockAlert>) => {
    setEditItem({
      ...item,
      price: item.config?.price ?? 0,
      operator: item.config?.operator ?? '<=',
      amountOfNotifications: item.config?.amountOfNotifications ?? 1,
      checkIntervalMinutes: item.config?.checkIntervalMinutes ?? 60,
      anotherNotificationEachPercentage: item.config?.anotherNotificationEachPercentage ?? 10,
      emailsText: (item.emails ?? []).join(', '),
    })
    setDialogOpen(true)
  }

  const actions = useTableActions<StockAlert>({
    onDelete: async (selected) => { for (const r of selected) await stockAlertsApi.delete(r.id) },
    onEdit: openEdit,
    onRefresh: load,
  })

  const set = (field: keyof EditState, value: unknown) =>
    setEditItem((s) => ({ ...s, [field]: value }))

  const handleSave = async () => {
    const emails = (editItem.emailsText ?? '').split(',').map((e) => e.trim()).filter(Boolean)
    const payload = {
      name: editItem.name,
      symbol: editItem.symbol,
      exchange: editItem.exchange,
      emails,
      price: editItem.price,
      operator: editItem.operator,
      amountOfNotifications: editItem.amountOfNotifications,
      checkIntervalMinutes: editItem.checkIntervalMinutes,
      anotherNotificationEachPercentage: editItem.anotherNotificationEachPercentage,
    }
    try {
      if (editItem.id) {
        await stockAlertsApi.update(editItem.id, payload)
      } else {
        await stockAlertsApi.create(payload)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save alert')
    }
  }

  return (
    <div className={styles.page}>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        page={table.page}
        pageSize={table.pageSize}
        totalElements={total}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        actions={actions}
        onRowClick={openEdit}
        onAdd={() => openEdit({ ...EMPTY })}
        addLabel="New Alert"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Alert' : 'New Alert'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="560px"
      >
        <div className={styles.form}>
          <TextField label="Alert Name" value={editItem.name ?? ''} onChange={(e) => set('name', e.target.value)} autoFocus />
          <TextField label="Symbol" value={editItem.symbol ?? ''} onChange={(e) => set('symbol', e.target.value.toUpperCase())} />
          <SelectField
            label="Exchange"
            value={editItem.exchange ?? 'GPW'}
            options={[{ value: 'GPW', label: 'GPW' }]}
            onChange={(e) => set('exchange', e.target.value)}
          />
          <TextField
            label="Emails (comma separated)"
            value={editItem.emailsText ?? ''}
            onChange={(e) => set('emailsText', e.target.value)}
          />
          <div className={styles.configSection}>
            <p className={styles.sectionLabel}>Alert Config</p>
            <SelectField
              label="Operator"
              value={editItem.operator ?? '<='}
              options={[{ value: '<=', label: '<=' }, { value: '>=', label: '>=' }]}
              onChange={(e) => set('operator', e.target.value)}
            />
            <NumberField label="Price" value={editItem.price ?? 0} onChange={(v) => set('price', v === '' ? 0 : v)} />
            <NumberField label="Notify how many times" value={editItem.amountOfNotifications ?? 1} onChange={(v) => set('amountOfNotifications', v === '' ? 1 : v)} />
            <NumberField label="Check interval (minutes)" value={editItem.checkIntervalMinutes ?? 60} onChange={(v) => set('checkIntervalMinutes', v === '' ? 60 : v)} />
            <NumberField label="Notify again each % change" value={editItem.anotherNotificationEachPercentage ?? 10} onChange={(v) => set('anotherNotificationEachPercentage', v === '' ? 10 : v)} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
