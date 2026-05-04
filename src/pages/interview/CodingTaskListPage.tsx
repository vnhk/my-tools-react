import { useEffect, useState } from 'react'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { toPage } from '../../api/crud'
import { TextField } from '../../components/fields/TextField'
import { TextArea } from '../../components/fields/TextArea'
import styles from './QuestionListPage.module.css'
import { CodingTask, codingTasksApi } from '../../api/interview'

const COLUMNS = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'initialCode', label: 'Initial Code', sortable: false },
    { key: 'exampleCode', label: 'Example Code', sortable: false },
    { key: 'questions', label: 'Questions', sortable: false },
]

function empty(): Partial<CodingTask> {
    return { name: '', initialCode: '', exampleCode: '', exampleCodeDetails: '', questions: '' }
}

export function CodingTaskListPage() {
    const { showSuccess, showError } = useNotification()
    const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'interview-coding-tasks')
    const [rows, setRows] = useState<CodingTask[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<Partial<CodingTask>>(empty())

    const load = () => {
        setLoading(true)
        codingTasksApi
            .getAll({ page: table.page, size: table.pageSize })
            .then(res => {
                const p = toPage(res.data)
                setRows(p.content)
                setTotal(p.totalElements)
            })
            .finally(() => setLoading(false))
    }

    useEffect(load, [table.page, table.pageSize])

    const actions = useTableActions<CodingTask>({
        onDelete: async (selected) => { for (const r of selected) await codingTasksApi.delete(r.id) },
        onEdit: (item) => { setEditItem(item); setDialogOpen(true) },
        onRefresh: load,
    })

    const handleSave = async () => {
        if (!editItem.name?.trim()) { showError('Name is required'); return }
        try {
            if (editItem.id) {
                await codingTasksApi.update(editItem.id, editItem)
            } else {
                await codingTasksApi.create(editItem)
            }
            showSuccess('Saved')
            setDialogOpen(false)
            load()
        } catch {
            showError('Failed to save coding task')
        }
    }

    const set = (field: keyof CodingTask) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditItem(s => ({ ...s, [field]: e.target.value }))

    return (
        <div className={styles.page}>
            <h2>Coding Tasks</h2>
            <DataTable
                columns={COLUMNS}
                rows={rows}
                rowKey={r => r.id}
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
                onRowClick={(item) => { setEditItem(item); setDialogOpen(true) }}
                onAdd={() => { setEditItem(empty()); setDialogOpen(true) }}
                addLabel="New Coding Task"
            />

            <Dialog
                open={dialogOpen}
                title={editItem.id ? 'Edit Coding Task' : 'New Coding Task'}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleSave}
                confirmLabel="Save"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <TextField label="Name" value={editItem.name ?? ''} onChange={set('name')} />
                    <TextArea label="Initial Code" value={editItem.initialCode ?? ''} onChange={set('initialCode')} />
                    <TextArea label="Example Code" value={editItem.exampleCode ?? ''} onChange={set('exampleCode')} />
                    <TextArea label="Example Code Details" value={editItem.exampleCodeDetails ?? ''} onChange={set('exampleCodeDetails')} />
                    <TextArea label="Questions" value={editItem.questions ?? ''} onChange={set('questions')} />
                </div>
            </Dialog>
        </div>
    )
}
