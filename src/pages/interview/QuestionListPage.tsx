import {useEffect, useState} from 'react'
import {DataTable} from '../../components/table/DataTable'
import {Dialog} from '../../components/ui/Dialog'
import {DynamicForm, validateFields} from '../../components/ui/DynamicForm'
import {buildColumnsFromConfig} from '../../components/table/configColumns'
import {useTableState} from '../../hooks/useTableState'
import {useTableActions} from '../../hooks/useTableActions'
import {useNotification} from '../../components/ui/Notification'
import {toPage} from '../../api/crud'
import styles from './QuestionListPage.module.css'
import {InterviewQuestion, interviewQuestionsApi} from "../../api/interview.ts";

export function QuestionListPage() {
    const {showSuccess, showError} = useNotification()
    const table = useTableState({sortBy: 'name', sortDir: 'asc'}, 'interview-questions-list')
    const [rows, setRows] = useState<InterviewQuestion[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<Partial<InterviewQuestion>>({name: ''})
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [refreshKey, setRefreshKey] = useState(0)

    const columns = [
        ...buildColumnsFromConfig<InterviewQuestion>('Question')
    ]

    const openEdit = (item: Partial<InterviewQuestion>) => {
        setEditItem({...item})
        setDialogOpen(true)
    }

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        interviewQuestionsApi
            .getAll({
                page: table.page,
                size: table.pageSize,
                sort: table.sortBy,
                direction: table.sortDir,
            })
            .then((res) => {
                if (cancelled) return
                const p = toPage(res.data)
                setRows(p.content)
                setTotal(p.totalElements)
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [table.page, table.pageSize, table.sortBy, table.sortDir, refreshKey])

    const load = () => setRefreshKey(k => k + 1)

    const actions = useTableActions<InterviewQuestion>({
        onDelete: async (selected) => {
            for (const r of selected) await interviewQuestionsApi.delete(r.id)
        },
        onEdit: (item) => {
            setEditItem(item);
            setFormErrors({});
            setDialogOpen(true)
        },
        onRefresh: load,
    })

    const handleSave = async () => {
        const errors = validateFields('Question', editItem as Record<string, unknown>)
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return
        }
        try {
            if (editItem.id) {
                await interviewQuestionsApi.update(editItem.id, editItem)
            } else {
                await interviewQuestionsApi.create(editItem)
            }
            showSuccess('Saved')
            setDialogOpen(false)
            load()
        } catch {
            showError('Failed to save question')
        }
    }

    const displayedRows = table.search
        ? rows.filter(r => r.name?.toLowerCase().includes(table.search.toLowerCase()))
        : rows

    return (
        <div className={styles.page}>
            <h2>Interview Questions</h2>
            <DataTable
                columns={columns}
                rows={displayedRows}
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
                onRowClick={openEdit}
                onAdd={() => {
                    setEditItem({name: ''});
                    setFormErrors({});
                    setDialogOpen(true)
                }}
                addLabel="New Question"
            />

            <Dialog
                open={dialogOpen}
                title={editItem.id ? 'Edit Question' : 'New Question'}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleSave}
                confirmLabel="Save"
            >
                <DynamicForm
                    entityName="Question"
                    mode={editItem.id ? 'edit' : 'save'}
                    values={editItem as Record<string, unknown>}
                    onChange={(field, value) => setEditItem((s) => ({...s, [field]: value}))}
                    errors={formErrors}
                />
            </Dialog>
        </div>
    )
}
