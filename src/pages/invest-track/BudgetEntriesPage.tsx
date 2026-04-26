import { useEffect, useState } from 'react'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { budgetEntriesApi, type BudgetEntry } from '../../api/investments'
import { toPage } from '../../api/crud'
import type { Column } from '../../components/table/DataTable'
import styles from './BudgetEntriesPage.module.css'

const EXTRA_COLUMNS: Column<BudgetEntry>[] = [
  { key: 'entryDate', header: 'Date', sortable: true },
  {
    key: 'value',
    header: 'Value',
    sortable: true,
    render: (row) => {
      const isIncome = row.entryType === 'Income'
      return (
        <span className={isIncome ? styles.income : styles.expense}>
          {isIncome ? '+' : '-'}{Number(row.value).toFixed(2)} {row.currency}
        </span>
      )
    },
  },
  { key: 'category', header: 'Category', sortable: true },
  { key: 'entryType', header: 'Type', sortable: true },
  { key: 'paymentMethod', header: 'Payment', sortable: true },
]

const EMPTY_ENTRY: Partial<BudgetEntry> = {
  name: '', category: '', currency: 'PLN', value: 0,
  entryDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Card', entryType: 'Expense', isRecurring: false,
}

export function BudgetEntriesPage() {
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'entryDate', sortDir: 'desc' }, 'budget-entries')
  const [rows, setRows] = useState<BudgetEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<BudgetEntry>>(EMPTY_ENTRY)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const columns = [
    ...buildColumnsFromConfig<BudgetEntry>('BudgetEntry', {}),
    ...EXTRA_COLUMNS,
  ]

  useEffect(() => {
    budgetEntriesApi.getCategories().then((res) => setCategories(res.data)).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true)
    budgetEntriesApi
      .getAll({ page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize, table.sortBy, table.sortDir])

  const openEdit = (item: Partial<BudgetEntry>) => {
    setEditItem(item)
    setFormErrors({})
    setDialogOpen(true)
  }

  const actions = useTableActions<BudgetEntry>({
    onDelete: async (selected) => { for (const r of selected) await budgetEntriesApi.delete(r.id) },
    onEdit: openEdit,
    onRefresh: load,
  })

  const handleSave = async () => {
    const errors = validateFields('BudgetEntry', editItem as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      if (editItem.id) {
        await budgetEntriesApi.update(editItem.id, editItem)
      } else {
        await budgetEntriesApi.create(editItem)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save entry')
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
        onRowClick={openEdit}
        onAdd={() => openEdit({ ...EMPTY_ENTRY })}
        addLabel="New Entry"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Entry' : 'New Entry'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="600px"
      >
        <DynamicForm
          entityName="BudgetEntry"
          mode={editItem.id ? 'edit' : 'save'}
          values={editItem as Record<string, unknown>}
          onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
          errors={formErrors}
          dynamicOptions={{ category: categories }}
        />
      </Dialog>
    </div>
  )
}
