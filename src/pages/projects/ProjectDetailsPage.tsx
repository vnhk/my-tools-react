import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { InlineEditableField } from '../../components/ui/InlineEditableField'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TextArea } from '../../components/fields/TextArea'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import {
  projectsApi, tasksApi,
  type ProjectDto, type ProjectStats, type TaskDto, type TaskCreateRequest,
  TASK_STATUSES, TASK_PRIORITIES,
} from '../../api/projects'
import { toPage } from '../../api/crud'
import styles from './ProjectDetailsPage.module.css'

const TYPE_ICONS: Record<string, string> = {
  Task: '☑', Bug: '🐛', Story: '📖', Feature: '💡', Objective: '🎯',
}

const DEFAULT_TASK: Partial<TaskCreateRequest> = {
  status: 'Open', type: 'Task', priority: 'Medium',
}

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'number', sortDir: 'asc' }, `project-tasks-${projectId}`)

  const [project, setProject] = useState<ProjectDto | null>(null)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [taskTotal, setTaskTotal] = useState(0)
  const [loadingTasks, setLoadingTasks] = useState(false)

  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [taskDialog, setTaskDialog] = useState(false)
  const [editTask, setEditTask] = useState<Partial<TaskDto & TaskCreateRequest>>(DEFAULT_TASK)
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({})

  const loadProject = () => {
    if (!projectId) return
    projectsApi.getById(projectId).then((r) => setProject(r.data)).catch(() => {})
    projectsApi.getStats(projectId).then((r) => setStats(r.data)).catch(() => {})
  }

  const loadTasks = () => {
    if (!projectId) return
    setLoadingTasks(true)
    tasksApi
      .getByProject(projectId, { page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir, search: table.search || undefined })
      .then((r) => { const p = toPage(r.data); setTasks(p.content); setTaskTotal(p.totalElements) })
      .finally(() => setLoadingTasks(false))
  }

  useEffect(() => { loadProject(); loadTasks() }, [projectId])
  useEffect(loadTasks, [table.page, table.pageSize, table.sortBy, table.sortDir, table.search])

  const patchProject = async (fields: Partial<ProjectDto>) => {
    if (!project) return
    await projectsApi.update(project.id, fields).catch(() => showError('Save failed'))
    loadProject()
  }

  const saveDesc = async () => {
    await patchProject({ description: descDraft })
    setEditingDesc(false)
  }

  const taskColumns = buildColumnsFromConfig<TaskDto>('Task', {
    name: {
      render: (row) => (
        <span className={styles.nameLink}>
          <span className={styles.typeIcon}>{TYPE_ICONS[row.type] ?? '☑'}</span>
          {row.name}
        </span>
      ),
    },
    status: {
      render: (row) => <StatusBadge value={row.status} />,
    },
    priority: {
      render: (row) => <StatusBadge value={row.priority} />,
    },
  })

  const taskActions = useTableActions<TaskDto>({
    onDelete: async (selected) => { for (const t of selected) await tasksApi.delete(t.id) },
    onEdit: (item) => { setEditTask(item); setTaskErrors({}); setTaskDialog(true) },
    onRefresh: () => { loadTasks(); loadProject() },
  })

  const handleTaskSave = async () => {
    const errors = validateFields('Task', editTask as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setTaskErrors(errors); return }
    try {
      if ((editTask as TaskDto).id) {
        await tasksApi.patchUpdate((editTask as TaskDto).id, editTask as Partial<TaskDto>)
      } else {
        if (!projectId) return
        await tasksApi.create({ ...(editTask as TaskCreateRequest), projectId })
      }
      showSuccess('Saved')
      setTaskDialog(false)
      loadTasks()
      loadProject()
    } catch {
      showError('Failed to save task')
    }
  }

  if (!project) return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading…</div>

  return (
    <div className={styles.page}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>← Projects</Button>

      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.projectNumber}>{project.number}</span>
          <h2 className={styles.projectName}>{project.name}</h2>
        </div>
        <div className={styles.inlineFields}>
          <InlineEditableField
            label="Status"
            value={project.status}
            fieldType="COMBOBOX"
            options={TASK_STATUSES}
            onSave={(v) => patchProject({ status: String(v ?? '') })}
          />
          <InlineEditableField
            label="Priority"
            value={project.priority}
            fieldType="COMBOBOX"
            options={TASK_PRIORITIES}
            onSave={(v) => patchProject({ priority: String(v ?? '') })}
          />
        </div>
      </div>

      {stats && (
        <div className={styles.statsRow}>
          {[
            { label: 'Total', value: stats.total },
            { label: 'Open', value: stats.open },
            { label: 'In Progress', value: stats.inProgress },
            { label: 'Done', value: stats.done },
            { label: 'Overdue', value: stats.overdue, danger: true },
          ].map((s) => (
            <div key={s.label} className={`${styles.stat} ${s.danger && s.value > 0 ? styles.statOverdue : ''}`}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Description</span>
          {!editingDesc && (
            <Button variant="secondary" size="sm"
              onClick={() => { setDescDraft(project.description ?? ''); setEditingDesc(true) }}>
              Edit
            </Button>
          )}
        </div>
        {editingDesc ? (
          <>
            <TextArea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
            />
            <div className={styles.editorActions}>
              <Button variant="success" size="sm" onClick={saveDesc}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setEditingDesc(false)}>Cancel</Button>
            </div>
          </>
        ) : project.description ? (
          <div className={styles.descView} dangerouslySetInnerHTML={{ __html: project.description }} />
        ) : (
          <div className={styles.descEmpty}>No description. Click Edit to add one.</div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Tasks</span>
        </div>
        <DataTable
          columns={taskColumns}
          rows={tasks}
          rowKey={(r) => r.id}
          loading={loadingTasks}
          page={table.page}
          pageSize={table.pageSize}
          totalElements={taskTotal}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          searchValue={table.search}
          onSearchChange={table.setSearch}
          actions={taskActions}
          onRowClick={(row) => navigate(`/projects/tasks/${row.id}`)}
          onAdd={() => { setEditTask({ ...DEFAULT_TASK }); setTaskErrors({}); setTaskDialog(true) }}
          addLabel="New Task"
        />
      </div>

      <Dialog
        open={taskDialog}
        title={(editTask as TaskDto).id ? 'Edit Task' : 'New Task'}
        onClose={() => setTaskDialog(false)}
        onConfirm={handleTaskSave}
        confirmLabel="Save"
      >
        <DynamicForm
          entityName="Task"
          mode={(editTask as TaskDto).id ? 'edit' : 'save'}
          values={editTask as Record<string, unknown>}
          onChange={(field, value) => setEditTask((s) => ({ ...s, [field]: value }))}
          errors={taskErrors}
        />
      </Dialog>
    </div>
  )
}
