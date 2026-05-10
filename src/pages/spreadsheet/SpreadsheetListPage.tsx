import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { spreadsheetApi, type SpreadsheetItem } from '../../api/spreadsheet'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/fields/TextField'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import styles from './SpreadsheetListPage.module.css'

export function SpreadsheetListPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'spreadsheets')
  const [rows, setRows] = useState<SpreadsheetItem[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'description', header: 'Description', sortable: false },
  ]

  const load = () => {
    setLoading(true)
    spreadsheetApi.list()
      .then((r) => setRows(r.data ?? []))
      .catch(() => showError('Failed to load spreadsheets'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const actions = useTableActions<SpreadsheetItem>({
    onDelete: async (selected) => {
      for (const r of selected) await spreadsheetApi.delete(r.id)
    },
    onRefresh: load,
  })

  const handleCreate = async () => {
    if (!name.trim()) { setNameError('Name is required'); return }
    try {
      const res = await spreadsheetApi.create(name.trim(), description.trim() || undefined)
      showSuccess('Spreadsheet created')
      setDialogOpen(false)
      setName('')
      setDescription('')
      navigate(`/spreadsheet/${res.data.id}`)
    } catch {
      showError('Failed to create spreadsheet')
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
        totalElements={rows.length}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        searchValue={table.search}
        onSearchChange={table.setSearch}
        actions={actions}
        onAdd={() => { setName(''); setDescription(''); setNameError(''); setDialogOpen(true) }}
        addLabel="New Spreadsheet"
        onRowClick={(r) => navigate(`/spreadsheet/${r.id}`)}
      />

      <Dialog
        open={dialogOpen}
        title="New Spreadsheet"
        onClose={() => setDialogOpen(false)}
        onConfirm={handleCreate}
        confirmLabel="Create"
      >
        <div className={styles.form}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError('') }}
            error={nameError}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  )
}
