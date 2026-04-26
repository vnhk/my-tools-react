import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { Checkbox } from '../../components/fields/Checkbox'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { walletsApi, type Wallet } from '../../api/investments'
import { toPage } from '../../api/crud'
import styles from './WalletListPage.module.css'

const EXTRA_COLUMNS = [
  {
    key: 'currentValue',
    header: 'Current Value',
    sortable: true,
    render: (row: Wallet) => (
      <span className={styles.value}>{row.currentValue?.toFixed(2)} {row.currency}</span>
    ),
  },
  {
    key: 'returnRate',
    header: 'Return %',
    sortable: true,
    render: (row: Wallet) => {
      const pct = row.returnRate ? (row.returnRate as number) : 0
      return (
        <span className={pct >= 0 ? styles.positive : styles.negative}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
        </span>
      )
    },
  },
  { key: 'modificationDate', header: 'Modified', sortable: true },
]

const EMPTY_WALLET: Partial<Wallet> = {
  name: '', description: '', currency: 'PLN', riskLevel: 'Medium Risk', walletType: 'INVESTMENT', compareWithSP500: true,
}

export function WalletListPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'wallet-list')
  const [rows, setRows] = useState<Wallet[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<Wallet>>(EMPTY_WALLET)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const columns = [
    ...buildColumnsFromConfig<Wallet>('Wallet', {
      name: { render: (row) => <span className={styles.nameLink}>{row.name}</span> },
    }),
    ...EXTRA_COLUMNS,
  ]

  const load = () => {
    setLoading(true)
    walletsApi
      .getAll({ page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize, table.sortBy, table.sortDir])

  const openEdit = (item: Partial<Wallet>) => {
    setEditItem(item)
    setFormErrors({})
    setDialogOpen(true)
  }

  const actions = useTableActions<Wallet>({
    onDelete: async (selected) => { for (const r of selected) await walletsApi.delete(r.id) },
    onEdit: openEdit,
    onRefresh: load,
  })

  const handleSave = async () => {
    const errors = validateFields('Wallet', editItem as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      if (editItem.id) {
        await walletsApi.update(editItem.id, editItem)
      } else {
        await walletsApi.create(editItem)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save wallet')
    }
  }

  return (
    <div className={styles.page}>
      <DataTable
        columns={columns}
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
        onRowClick={(row) => navigate(`/invest-track/wallets/${row.id}`)}
        onAdd={() => openEdit(EMPTY_WALLET)}
        addLabel="New Wallet"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Wallet' : 'New Wallet'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="600px"
      >
        <DynamicForm
          entityName="Wallet"
          mode={editItem.id ? 'edit' : 'save'}
          values={editItem as Record<string, unknown>}
          onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
          errors={formErrors}
        />
        <Checkbox
          label="Compare with S&P 500"
          checked={editItem.compareWithSP500 ?? true}
          onChange={(e) => setEditItem((s) => ({ ...s, compareWithSP500: e.target.checked }))}
        />
      </Dialog>
    </div>
  )
}
