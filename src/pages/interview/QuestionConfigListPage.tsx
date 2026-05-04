import { useEffect, useState } from 'react'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { toPage } from '../../api/crud'
import { TextField } from '../../components/fields/TextField'
import styles from './QuestionListPage.module.css'
import { QuestionConfig, questionConfigsApi } from '../../api/interview'

const COLUMNS = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'difficulty1Percent', label: 'L1 %', sortable: false },
    { key: 'difficulty2Percent', label: 'L2 %', sortable: false },
    { key: 'difficulty3Percent', label: 'L3 %', sortable: false },
    { key: 'difficulty4Percent', label: 'L4 %', sortable: false },
    { key: 'difficulty5Percent', label: 'L5 %', sortable: false },
    { key: 'codingTasksAmount', label: 'Coding Tasks', sortable: false },
]

function empty(): Partial<QuestionConfig> {
    return { name: '', difficulty1Percent: 0, difficulty2Percent: 0, difficulty3Percent: 0, difficulty4Percent: 0, difficulty5Percent: 0, codingTasksAmount: 0 }
}

export function QuestionConfigListPage() {
    const { showSuccess, showError, showWarning } = useNotification()
    const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'interview-question-configs')
    const [rows, setRows] = useState<QuestionConfig[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<Partial<QuestionConfig>>(empty())

    const load = () => {
        setLoading(true)
        questionConfigsApi
            .getAll({ page: table.page, size: table.pageSize })
            .then(res => {
                const p = toPage(res.data)
                setRows(p.content)
                setTotal(p.totalElements)
            })
            .finally(() => setLoading(false))
    }

    useEffect(load, [table.page, table.pageSize])

    const actions = useTableActions<QuestionConfig>({
        onDelete: async (selected) => { for (const r of selected) await questionConfigsApi.delete(r.id) },
        onEdit: (item) => { setEditItem(item); setDialogOpen(true) },
        onRefresh: load,
    })

    const handleSave = async () => {
        if (!editItem.name?.trim()) { showError('Name is required'); return }
        const sum = (editItem.difficulty1Percent ?? 0) + (editItem.difficulty2Percent ?? 0) +
            (editItem.difficulty3Percent ?? 0) + (editItem.difficulty4Percent ?? 0) + (editItem.difficulty5Percent ?? 0)
        if (sum !== 100) { showWarning(`Percentages must sum to 100% (currently ${sum}%)`); return }
        try {
            if (editItem.id) {
                await questionConfigsApi.update(editItem.id, editItem)
            } else {
                await questionConfigsApi.create(editItem)
            }
            showSuccess('Saved')
            setDialogOpen(false)
            load()
        } catch {
            showError('Failed to save config')
        }
    }

    const setNum = (field: keyof QuestionConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setEditItem(s => ({ ...s, [field]: e.target.value === '' ? 0 : Number(e.target.value) }))

    return (
        <div className={styles.page}>
            <h2>Question Configs</h2>
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
                addLabel="New Config"
            />

            <Dialog
                open={dialogOpen}
                title={editItem.id ? 'Edit Config' : 'New Config'}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleSave}
                confirmLabel="Save"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <TextField label="Name" value={editItem.name ?? ''} onChange={e => setEditItem(s => ({ ...s, name: e.target.value }))} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                        {([1, 2, 3, 4, 5] as const).map(lvl => (
                            <TextField
                                key={lvl}
                                label={`Level ${lvl} %`}
                                type="number"
                                value={String(editItem[`difficulty${lvl}Percent` as keyof QuestionConfig] ?? 0)}
                                onChange={setNum(`difficulty${lvl}Percent` as keyof QuestionConfig)}
                            />
                        ))}
                        <TextField
                            label="Coding Tasks Amount"
                            type="number"
                            value={String(editItem.codingTasksAmount ?? 0)}
                            onChange={setNum('codingTasksAmount')}
                        />
                    </div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Percentages must sum to 100%
                    </span>
                </div>
            </Dialog>
        </div>
    )
}
