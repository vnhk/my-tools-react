import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { pocketsApi, type Pocket } from '../../api/pockets'
import { toPage } from '../../api/crud'
import styles from './PocketListPage.module.css'

const EXTRA_COLUMNS = [
  { key: 'pocketSize', header: 'Items', sortable: true },
  { key: 'creationDate', header: 'Created', sortable: true },
  { key: 'modificationDate', header: 'Modified', sortable: true },
]

export function PocketListPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'pocket-list')
  const [rows, setRows] = useState<Pocket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<Pocket>>({ name: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const columns = [
    ...buildColumnsFromConfig<Pocket>('Pocket', {
      name: { render: (row) => <span className={styles.nameLink}>{row.name}</span> },
    }),
    ...EXTRA_COLUMNS,
  ]

  const load = () => {
    setLoading(true)
    pocketsApi
      .getAll({ page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir, search: table.search || undefined })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize, table.sortBy, table.sortDir, table.search])

  const actions = useTableActions<Pocket>({
    onDelete: async (selected) => { for (const r of selected) await pocketsApi.delete(r.id) },
    onEdit: (item) => { setEditItem(item); setFormErrors({}); setDialogOpen(true) },
    onRefresh: load,
  })

  const handleSave = async () => {
    const errors = validateFields('Pocket', editItem as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      if (editItem.id) {
        await pocketsApi.update(editItem.id, editItem)
      } else {
        await pocketsApi.create(editItem)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save pocket')
    }
  }

  return (
    <div className={styles.page}>
      <h2>Pockets</h2>
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
        searchValue={table.search}
        onSearchChange={table.setSearch}
        actions={actions}
        onRowClick={(row) => navigate(`/pocket/${encodeURIComponent(row.name)}`)}
        onAdd={() => { setEditItem({ name: '' }); setFormErrors({}); setDialogOpen(true) }}
        addLabel="New Pocket"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Pocket' : 'New Pocket'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel="Save"
      >
        <DynamicForm
          entityName="Pocket"
          mode={editItem.id ? 'edit' : 'save'}
          values={editItem as Record<string, unknown>}
          onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
          errors={formErrors}
        />
      </Dialog>
    </div>
  )
}
