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
import { tasksApi, type TaskDto } from '../../api/projects'
import { toPage } from '../../api/crud'
import styles from './AllTasksPage.module.css'

const TYPE_ICONS: Record<string, string> = {
  Task: '☑',
  Bug: '🐛',
  Story: '📖',
  Feature: '💡',
  Objective: '🎯',
}

export function AllTasksPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'number', sortDir: 'asc' }, 'all-tasks')
  const [rows, setRows] = useState<TaskDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<TaskDto>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const columns = buildColumnsFromConfig<TaskDto>('Task', {
    name: {
      render: (row) => (
        <span className={styles.nameLink}>
          <span className={styles.typeIcon}>{TYPE_ICONS[row.type] ?? '☑'}</span>
          {row.name}
        </span>
      ),
    },
    status: { render: (row) => <StatusBadge value={row.status} /> },
    priority: { render: (row) => <StatusBadge value={row.priority} /> },
  })

  const load = () => {
    setLoading(true)
    tasksApi
      .getAll({ page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir, search: table.search || undefined })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize, table.sortBy, table.sortDir, table.search])

  const actions = useTableActions<TaskDto>({
    onDelete: async (selected) => { for (const r of selected) await tasksApi.delete(r.id) },
    onEdit: (item) => { setEditItem(item); setFormErrors({}); setDialogOpen(true) },
    onRefresh: load,
  })

  const handleSave = async () => {
    if (!editItem.id) return
    const errors = validateFields('Task', editItem as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      await tasksApi.update(editItem.id, editItem)
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save task')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>← Projects</Button>
        <h2>All Tasks</h2>
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
        onRowClick={(row) => navigate(`/projects/tasks/${row.id}`)}
      />

      <Dialog
        open={dialogOpen}
        title="Edit Task"
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        confirmLabel="Save"
      >
        <DynamicForm
          entityName="Task"
          mode="edit"
          values={editItem as Record<string, unknown>}
          onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
          errors={formErrors}
        />
      </Dialog>
    </div>
  )
}
