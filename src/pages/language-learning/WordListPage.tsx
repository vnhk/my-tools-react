import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { toPage } from '../../api/crud'
import { languageLearningApi, TranslationRecord } from '../../api/languageLearning'
import styles from './WordListPage.module.css'

export function WordListPage() {
    const { showSuccess, showError } = useNotification()
    const { pathname } = useLocation()
    const language = pathname.startsWith('/english') ? 'EN' : 'ES'
    const table = useTableState({ sortBy: 'sourceText', sortDir: 'asc' }, `lang-words-${language}`)
    const [rows, setRows] = useState<TranslationRecord[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<Partial<TranslationRecord>>({ language, markedForLearning: true })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [refreshKey, setRefreshKey] = useState(0)

    const columns = buildColumnsFromConfig<TranslationRecord>('TranslationRecord')

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        languageLearningApi
            .list({
                page: table.page,
                size: table.pageSize,
                sort: table.sortBy,
                direction: table.sortDir,
                language,
            })
            .then((res) => {
                if (cancelled) return
                const p = toPage(res.data)
                setRows(p.content)
                setTotal(p.totalElements)
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [table.page, table.pageSize, table.sortBy, table.sortDir, refreshKey, language])

    const load = () => setRefreshKey((k) => k + 1)

    const actions = useTableActions<TranslationRecord>({
        onDelete: async (selected) => {
            for (const r of selected) await languageLearningApi.delete(r.id)
        },
        onEdit: (item) => {
            setEditItem({ ...item })
            setFormErrors({})
            setDialogOpen(true)
        },
        onRefresh: load,
    })

    const handleSave = async () => {
        const errors = validateFields('TranslationRecord', editItem as Record<string, unknown>)
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            return
        }
        try {
            const payload = { ...editItem, language }
            if (editItem.id) {
                await languageLearningApi.update(editItem.id, payload)
            } else {
                await languageLearningApi.create(payload)
            }
            showSuccess('Saved')
            setDialogOpen(false)
            load()
        } catch {
            showError('Failed to save')
        }
    }

    const displayedRows = table.search
        ? rows.filter((r) =>
            r.sourceText?.toLowerCase().includes(table.search.toLowerCase()) ||
            r.textTranslation?.toLowerCase().includes(table.search.toLowerCase())
          )
        : rows

    return (
        <div className={styles.page}>
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
                onRowClick={(item) => { setEditItem({ ...item }); setFormErrors({}); setDialogOpen(true) }}
                onAdd={() => { setEditItem({ language, markedForLearning: true }); setFormErrors({}); setDialogOpen(true) }}
                addLabel="Add Word"
            />

            <Dialog
                open={dialogOpen}
                title={editItem.id ? 'Edit Word' : 'Add Word'}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleSave}
                confirmLabel="Save"
            >
                <DynamicForm
                    entityName="TranslationRecord"
                    mode={editItem.id ? 'edit' : 'save'}
                    values={editItem as Record<string, unknown>}
                    onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
                    errors={formErrors}
                />
            </Dialog>
        </div>
    )
}
