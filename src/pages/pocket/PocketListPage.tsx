import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/fields/TextField'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { pocketsApi, type Pocket } from '../../api/pockets'
import { toPage } from '../../api/crud'
import styles from './PocketListPage.module.css'

const COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (row: Pocket) => <span className={styles.nameLink}>{row.name}</span>,
  },
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
    onEdit: (item) => { setEditItem(item); setDialogOpen(true) },
    onRefresh: load,
  })

  const handleSave = async () => {
    if (!editItem.name?.trim()) { showError('Name is required'); return }
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
        searchValue={table.search}
        onSearchChange={table.setSearch}
        actions={actions}
        onRowClick={(row) => navigate(`/pocket/${encodeURIComponent(row.name)}`)}
        onAdd={() => { setEditItem({ name: '' }); setDialogOpen(true) }}
        addLabel="New Pocket"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Pocket' : 'New Pocket'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel="Save"
      >
        <TextField
          label="Name"
          value={editItem.name ?? ''}
          onChange={(e) => setEditItem((s) => ({ ...s, name: e.target.value }))}
          required
          autoFocus
        />
      </Dialog>
    </div>
  )
}
