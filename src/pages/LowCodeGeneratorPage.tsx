import { useEffect, useState } from 'react'
import { DataTable } from '../components/table/DataTable'
import { Dialog } from '../components/ui/Dialog'
import { TextField } from '../components/fields/TextField'
import { useTableState } from '../hooks/useTableState'
import { useTableActions } from '../hooks/useTableActions'
import { useNotification } from '../components/ui/Notification'
import { lowcodeApi, type LowCodeClass, type LowCodeClassDetails } from '../api/lowcode'
import styles from './LowCodeGeneratorPage.module.css'

const COLUMNS = [
  { key: 'className', header: 'Class Name', sortable: true },
  { key: 'moduleName', header: 'Module', sortable: true },
  { key: 'packageName', header: 'Package' },
  { key: 'routeName', header: 'Route' },
  { key: 'status', header: 'Status', sortable: true },
  {
    key: 'historyEnabled',
    header: 'History',
    render: (row: LowCodeClass) => (row.historyEnabled ? 'Yes' : 'No'),
  },
]

const DETAILS_COLUMNS = [
  { key: 'field', header: 'Field' },
  { key: 'displayName', header: 'Display Name' },
  { key: 'type', header: 'Type' },
  { key: 'defaultValue', header: 'Default' },
  { key: 'inTable', header: 'In Table', render: (r: LowCodeClassDetails) => (r.inTable ? 'Yes' : 'No') },
  { key: 'inSaveForm', header: 'In Save', render: (r: LowCodeClassDetails) => (r.inSaveForm ? 'Yes' : 'No') },
  { key: 'inEditForm', header: 'In Edit', render: (r: LowCodeClassDetails) => (r.inEditForm ? 'Yes' : 'No') },
  { key: 'required', header: 'Required', render: (r: LowCodeClassDetails) => (r.required ? 'Yes' : 'No') },
]

const EMPTY_FORM: Partial<LowCodeClass> = {
  className: '',
  moduleName: '',
  packageName: '',
  routeName: '',
  historyEnabled: false,
}

export function LowCodeGeneratorPage() {
  const table = useTableState({ storageKey: 'lowcode-table' } as never)
  const { showSuccess, showError } = useNotification()
  const [rows, setRows] = useState<LowCodeClass[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<LowCodeClass>>(EMPTY_FORM)
  const [generateTarget, setGenerateTarget] = useState<LowCodeClass | null>(null)
  const [generating, setGenerating] = useState(false)

  const load = () => {
    setLoading(true)
    lowcodeApi
      .getAll({ page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir, search: table.search || undefined })
      .then((res) => { setRows(res.data.content); setTotal(res.data.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize, table.sortBy, table.sortDir, table.search])

  const actions = useTableActions<LowCodeClass>({
    onDelete: async (selected) => { for (const r of selected) await lowcodeApi.delete(r.id) },
    onEdit: (item) => { setEditItem(item); setEditOpen(true) },
    onRefresh: load,
  })

  const runGeneratorAction = {
    label: '⚙ Run Generator',
    variant: 'primary' as const,
    requiresSelection: true,
    onClick: (selected: LowCodeClass[]) => {
      if (selected.length !== 1) { showError("Select exactly one item"); return }
      setGenerateTarget(selected[0])
    },
  }

  const handleSave = async () => {
    try {
      if (editItem.id) {
        await lowcodeApi.update(editItem.id, editItem)
      } else {
        await lowcodeApi.create(editItem)
      }
      showSuccess('Saved successfully')
      setEditOpen(false)
      load()
    } catch {
      showError('Failed to save')
    }
  }

  const handleGenerate = async () => {
    if (!generateTarget) return
    setGenerating(true)
    try {
      await lowcodeApi.runGenerator(generateTarget.id)
      showSuccess('Code generation finished!')
      setGenerateTarget(null)
      load()
    } catch {
      showError('Code generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className={styles.page}>
      <h2>Low Code Generator</h2>

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
        actions={[runGeneratorAction, ...actions]}
        onAdd={() => { setEditItem(EMPTY_FORM); setEditOpen(true) }}
        addLabel="New Class"
      />

      {/* Edit / Create dialog */}
      <Dialog
        open={editOpen}
        title={editItem.id ? 'Edit Class' : 'New Class'}
        onClose={() => setEditOpen(false)}
        onConfirm={handleSave}
        confirmLabel="Save"
        width="640px"
      >
        <div className={styles.form}>
          <TextField label="Class Name" value={editItem.className ?? ''} onChange={(e) => setEditItem((s) => ({ ...s, className: e.target.value }))} />
          <TextField label="Module Name" value={editItem.moduleName ?? ''} onChange={(e) => setEditItem((s) => ({ ...s, moduleName: e.target.value }))} />
          <TextField label="Package Name" value={editItem.packageName ?? ''} onChange={(e) => setEditItem((s) => ({ ...s, packageName: e.target.value }))} />
          <TextField label="Route Name" value={editItem.routeName ?? ''} onChange={(e) => setEditItem((s) => ({ ...s, routeName: e.target.value }))} />
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={editItem.historyEnabled ?? false} onChange={(e) => setEditItem((s) => ({ ...s, historyEnabled: e.target.checked }))} />
            History Enabled
          </label>

          {editItem.id && editItem.lowCodeClassDetails && editItem.lowCodeClassDetails.length > 0 && (
            <div className={styles.details}>
              <h4>Fields</h4>
              <DataTable
                columns={DETAILS_COLUMNS}
                rows={editItem.lowCodeClassDetails}
                rowKey={(r) => r.id}
              />
            </div>
          )}
        </div>
      </Dialog>

      {/* Run generator confirm dialog */}
      <Dialog
        open={!!generateTarget}
        title="Confirm Code Generation"
        onClose={() => setGenerateTarget(null)}
        onConfirm={handleGenerate}
        confirmLabel={generating ? 'Generating…' : 'Generate'}
      >
        <p>Generate code for <strong>{generateTarget?.className}</strong>?</p>
      </Dialog>
    </div>
  )
}
