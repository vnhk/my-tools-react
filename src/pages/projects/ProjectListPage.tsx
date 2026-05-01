import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { projectsApi, type ProjectDto } from '../../api/projects'
import { toPage } from '../../api/crud'
import styles from './ProjectListPage.module.css'

export function ProjectListPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'project-list')
  const [rows, setRows] = useState<ProjectDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<ProjectDto>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const columns = buildColumnsFromConfig<ProjectDto>('Project', {
    name: { render: (row) => <span className={styles.nameLink}>{row.name}</span> },
    status: { render: (row) => <StatusBadge value={row.status} /> },
    priority: { render: (row) => <StatusBadge value={row.priority} /> },
  })

  const load = () => {
    setLoading(true)
    projectsApi
      .getAll({ page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir, search: table.search || undefined })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize, table.sortBy, table.sortDir, table.search])

  const actions = useTableActions<ProjectDto>({
    onDelete: async (selected) => { for (const r of selected) await projectsApi.delete(r.id) },
    onEdit: (item) => { setEditItem(item); setFormErrors({}); setDialogOpen(true) },
    onRefresh: load,
  })

  const handleSave = async () => {
    const errors = validateFields('Project', editItem as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      if (editItem.id) {
        await projectsApi.update(editItem.id, editItem)
      } else {
        await projectsApi.create(editItem)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save project')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2>Projects</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/projects/all-tasks')}>
          All Tasks
        </Button>
      </div>
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
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
        onAdd={() => { setEditItem({}); setFormErrors({}); setDialogOpen(true) }}
        addLabel="New Project"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Project' : 'New Project'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel="Save"
      >
        <DynamicForm
          entityName="Project"
          mode={editItem.id ? 'edit' : 'save'}
          values={editItem as Record<string, unknown>}
          onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
          errors={formErrors}
        />
      </Dialog>
    </div>
  )
}
