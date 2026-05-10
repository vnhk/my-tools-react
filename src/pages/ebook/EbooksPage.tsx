import { useEffect, useState } from 'react'
import { ebookApi, type Ebook } from '../../api/ebook'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/fields/TextField'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import styles from './EbooksPage.module.css'

export function EbooksPage() {
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'ebookName', sortDir: 'asc' }, 'ebooks')
  const [rows, setRows] = useState<Ebook[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [ebookName, setEbookName] = useState('')
  const [nameError, setNameError] = useState('')

  const columns = [
    { key: 'ebookName', header: 'Ebook Name', sortable: true },
  ]

  const load = () => {
    setLoading(true)
    ebookApi.listEbooks()
      .then((res) => setRows(res.data ?? []))
      .catch(() => showError('Failed to load ebooks'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const actions = useTableActions<Ebook>({
    onDelete: async (selected) => {
      for (const r of selected) await ebookApi.deleteEbook(r.id)
    },
    onRefresh: load,
  })

  const handleSave = async () => {
    if (!ebookName.trim()) { setNameError('Ebook name is required'); return }
    try {
      await ebookApi.createEbook(ebookName.trim())
      showSuccess('Ebook added')
      setDialogOpen(false)
      setEbookName('')
      load()
    } catch {
      showError('Failed to add ebook — make sure the file exists in the configured folder')
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
        onAdd={() => { setEbookName(''); setNameError(''); setDialogOpen(true) }}
        addLabel="Add Ebook"
      />

      <Dialog
        open={dialogOpen}
        title="Add Ebook"
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel="Add"
      >
        <div className={styles.form}>
          <TextField
            label="Ebook Name (filename)"
            value={ebookName}
            onChange={(e) => { setEbookName(e.target.value); setNameError('') }}
            error={nameError}
          />
          <p className={styles.hint}>
            The file must exist in the configured ebook storage folder on the server.
            Supported formats: .epub, .pdf, .vtt, .srt
          </p>
        </div>
      </Dialog>
    </div>
  )
}
