import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import { InlineEditableField } from '../../components/ui/InlineEditableField'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { CustomSelect } from '../../components/fields/CustomSelect'
import { TextArea } from '../../components/fields/TextArea'
import fieldStyles from '../../components/fields/Field.module.css'
import {
  tasksApi,
  TASK_STATUSES, TASK_TYPES, TASK_PRIORITIES, RELATION_TYPES,
  type TaskDetailDto, type TaskRelationDto, type TaskSearchResult,
} from '../../api/projects'
import styles from './TaskDetailsPage.module.css'

const TYPE_ICONS: Record<string, string> = {
  Task: '☑', Bug: '🐛', Story: '📖', Feature: '💡', Objective: '🎯',
}

type RelGroup = { label: string; relations: TaskRelationDto[] }

function groupRelations(relations: TaskRelationDto[]): RelGroup[] {
  const map = new Map<string, TaskRelationDto[]>()
  for (const r of relations) {
    const key = r.displayName
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([label, rels]) => ({ label, relations: rels }))
}

export function TaskDetailsPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()

  const [task, setTask] = useState<TaskDetailDto | null>(null)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [tagInput, setTagInput] = useState('')

  const [relType, setRelType] = useState(RELATION_TYPES[0].value)
  const [relSearch, setRelSearch] = useState('')
  const [relSuggestions, setRelSuggestions] = useState<TaskSearchResult[]>([])
  const relSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(() => {
    if (!taskId) return
    tasksApi.getById(taskId).then((r) => setTask(r.data)).catch(() => {})
  }, [taskId])

  useEffect(() => { load() }, [load])

  const patch = async (fields: Partial<TaskDetailDto>) => {
    if (!task) return
    await tasksApi.patchUpdate(task.id, fields).catch(() => showError('Save failed'))
    load()
  }

  const saveDesc = async () => {
    await patch({ description: descDraft })
    setEditingDesc(false)
  }

  const addTag = async (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || !task) return
    const existing = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    if (existing.includes(trimmed)) return
    await patch({ tags: [...existing, trimmed].join(',') })
    setTagInput('')
  }

  const removeTag = async (tag: string) => {
    if (!task) return
    const existing = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    await patch({ tags: existing.filter((t) => t !== tag).join(',') || null })
  }

  const handleRelSearch = (q: string) => {
    setRelSearch(q)
    if (relSearchRef.current) clearTimeout(relSearchRef.current)
    if (!q.trim() || !task) { setRelSuggestions([]); return }
    relSearchRef.current = setTimeout(() => {
      tasksApi.search(task.projectId, q).then((r) => {
        setRelSuggestions(r.data.filter((s) => s.id !== task.id))
      }).catch(() => {})
    }, 250)
  }

  const pickRelation = async (target: TaskSearchResult) => {
    if (!task) return
    setRelSearch('')
    setRelSuggestions([])
    try {
      const selectedType = RELATION_TYPES.find((rt) => rt.value === relType)!
      await tasksApi.addRelation(task.id, task.id, target.id, relType)
      showSuccess(`Linked: ${selectedType.parentLabel} ${target.number}`)
      load()
    } catch {
      showError('Failed to add relation')
    }
  }

  const removeRelation = async (rel: TaskRelationDto) => {
    if (!task) return
    try {
      await tasksApi.deleteRelation(task.id, rel.id)
      showSuccess('Relation removed')
      load()
    } catch {
      showError('Failed to remove relation')
    }
  }

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  if (!task) return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading…</div>

  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const pct = task.completionPercentage ?? 0
  const groups = groupRelations(task.relations ?? [])

  return (
    <div className={styles.page}>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.typeIcon}>{TYPE_ICONS[task.type] ?? '☑'}</span>
          <span className={styles.taskNumber}>{task.number}</span>
          <h2 className={styles.taskName}>{task.name}</h2>
        </div>
        <div className={styles.breadcrumb}>
          <span
            className={styles.breadcrumbLink}
            onClick={() => navigate(`/projects/${task.projectId}`)}
          >
            {task.projectName} ({task.projectNumber})
          </span>
          {' / '}
          {task.number}
        </div>
        <div className={styles.inlineFields}>
          <InlineEditableField
            label="Status"
            value={task.status}
            fieldType="COMBOBOX"
            options={TASK_STATUSES}
            onSave={(v) => patch({ status: String(v ?? '') })}
          />
          <InlineEditableField
            label="Priority"
            value={task.priority}
            fieldType="COMBOBOX"
            options={TASK_PRIORITIES}
            onSave={(v) => patch({ priority: String(v ?? '') })}
          />
          <InlineEditableField
            label="Type"
            value={task.type}
            fieldType="COMBOBOX"
            options={TASK_TYPES}
            onSave={(v) => patch({ type: String(v ?? '') })}
          />
        </div>
      </div>

      {/* Metadata grid */}
      <div className={styles.metaGrid}>
        <InlineEditableField
          label="Assignee"
          value={task.assignee}
          fieldType="TEXT"
          onSave={(v) => patch({ assignee: v as string | null })}
        />
        <InlineEditableField
          label="Due Date"
          value={task.dueDate}
          fieldType="DATETIME"
          onSave={(v) => patch({ dueDate: v as string | null })}
        />
        <InlineEditableField
          label="Estimated Hours"
          value={task.estimatedHours}
          fieldType="NUMBER"
          onSave={(v) => patch({ estimatedHours: v as number | null })}
        />
      </div>

      {/* Progress */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Progress</span>
          <div className={styles.progressPctField}>
            <InlineEditableField
              label=""
              value={pct}
              fieldType="NUMBER"
              onSave={(v) => {
                const n = Number(v)
                patch({ completionPercentage: isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) })
              }}
            />
          </div>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tags */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Tags</span>
        </div>
        <div className={styles.tagRow}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
              <button className={styles.tagRemove} onClick={() => removeTag(tag)}>×</button>
            </span>
          ))}
          <input
            className={`${fieldStyles.input} ${styles.tagInput}`}
            value={tagInput}
            placeholder="Add tag…"
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTag(tagInput) }}
          />
        </div>
      </div>

      {/* Description */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Description</span>
          {!editingDesc && (
            <Button variant="secondary" size="sm"
              onClick={() => { setDescDraft(task.description ?? ''); setEditingDesc(true) }}
            >
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
        ) : task.description ? (
          <div className={styles.descView} dangerouslySetInnerHTML={{ __html: task.description }} />
        ) : (
          <div className={styles.descEmpty}>No description. Click Edit to add one.</div>
        )}
      </div>

      {/* Relations */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Relations</span>
        </div>

        {groups.length === 0 && (
          <div className={styles.descEmpty}>No relations yet.</div>
        )}

        {groups.map(({ label, relations: rels }) => (
          <div key={label} className={styles.relGroup}>
            <div className={styles.relGroupHeader} onClick={() => toggleGroup(label)}>
              <span>{collapsedGroups.has(label) ? '▶' : '▼'}</span>
              <span>{label}</span>
              <span>({rels.length})</span>
            </div>
            {!collapsedGroups.has(label) && rels.map((rel) => (
              <div
                key={rel.id}
                className={styles.relRow}
                onClick={() => navigate(`/projects/tasks/${rel.relatedTaskId}`)}
              >
                <span className={styles.relTaskNumber}>{rel.relatedTaskNumber}</span>
                <span className={styles.relTaskName}>{rel.relatedTaskName}</span>
                <StatusBadge value={rel.relatedTaskStatus} />
                <button
                  className={styles.relRemove}
                  onClick={(e) => { e.stopPropagation(); removeRelation(rel) }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* Add relation */}
        <div className={styles.addRelRow}>
          <div className={styles.relTypeSelect}>
            <CustomSelect
              options={RELATION_TYPES.map((rt) => ({ value: rt.value, label: rt.parentLabel }))}
              value={relType}
              onChange={(v) => setRelType(String(v))}
              size="sm"
            />
          </div>
          <div className={styles.relSearchWrapper}>
            <input
              className={`${fieldStyles.input} ${styles.relTaskSearch}`}
              placeholder="Search task to link…"
              value={relSearch}
              onChange={(e) => handleRelSearch(e.target.value)}
            />
            {relSuggestions.length > 0 && (
              <div className={styles.relSuggestions}>
                {relSuggestions.map((s) => (
                  <div
                    key={s.id}
                    className={styles.relSuggestion}
                    onMouseDown={() => pickRelation(s)}
                  >
                    {s.number} — {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
