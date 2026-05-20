import {useEffect, useState} from 'react'
import {DataTable} from '../../components/table/DataTable'
import {Dialog} from '../../components/ui/Dialog'
import {ImportExportBar} from '../../components/ui/ImportExportBar'
import {EntityFilters} from '../../components/ui/EntityFilters'
import {useTableState} from '../../hooks/useTableState'
import {useTableActions} from '../../hooks/useTableActions'
import {useEntityFilters} from '../../hooks/useEntityFilters'
import {useNotification} from '../../components/ui/Notification'
import {type IngredientDto, ingredientsApi} from '../../api/cookBook'
import {toPage} from '../../api/crud'
import styles from './IngredientsPage.module.css'
import {DynamicForm, validateFields} from '../../components/ui/DynamicForm'
import {buildColumnsFromConfig} from "../../components/table/configColumns.tsx";


export function IngredientsPage() {
    const {showSuccess, showError} = useNotification()
    const table = useTableState(
        {sortBy: 'name', sortDir: 'asc'},
        'ingredients',
    )
    const {filters, setFilter, clearFilters} = useEntityFilters()
    const [rows, setRows] = useState<IngredientDto[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<Partial<IngredientDto>>({})
    const [refreshKey, setRefreshKey] = useState(0)
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const load = () => setRefreshKey(k => k + 1)
    const COLUMNS = buildColumnsFromConfig<IngredientDto>('Ingredient',
        {
            category: {
                render: (row) =>
                    row.category
                        ? <span className={styles.catBadge}>{row.category}</span>
                        : '—',
            }
        })

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        ingredientsApi.list({
            page: table.page,
            size: table.pageSize,
            sort: table.sortBy,
            direction: table.sortDir,
            ...filters,
        }).then((res) => {
            if (cancelled) return
            const p = toPage(res.data)
            setRows(p.content)
            setTotal(p.totalElements)
        })
            .catch(() => showError('Failed to load ingredients'))
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [
        table.page, table.pageSize, table.sortBy, table.sortDir, refreshKey, JSON.stringify(filters),
    ])

    const actions = useTableActions<IngredientDto>({
        onDelete: async (selected) => {
            for (const r of selected) {
                await ingredientsApi.delete(r.id)
            }
        },
        onEdit: (item) => {
            setEditItem({...item})
            setFormErrors({})
            setDialogOpen(true)
        },
        onRefresh: load,
    })

    const handleSave = async () => {
        const errors = validateFields('Ingredient', editItem as Record<string, unknown>)
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            return
        }
        try {
            if (editItem.id) {
                await ingredientsApi.update(editItem.id, editItem)
            } else {
                await ingredientsApi.create(editItem)
            }
            showSuccess('Saved')
            setDialogOpen(false)
            load()
        } catch {
            showError('Failed to save ingredient')
        }
    }

    return (
        <div className={styles.page}>
            <ImportExportBar
                exportUrl="/cook-book/ingredients/export"
                importUrl="/cook-book/ingredients/import"
                entityLabel="Ingredients"
                onImportSuccess={load}
                filters={filters}
            />
            <EntityFilters
                entityName="Ingredient"
                filters={filters}
                onFiltersChange={setFilter}
                onClear={clearFilters}
            />
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
                actions={actions}
                onRowClick={(item) => {
                    setEditItem({...item});
                    setFormErrors({});
                    setDialogOpen(true)
                }}
                onAdd={() => {
                    setEditItem({});
                    setFormErrors({});
                    setDialogOpen(true)
                }}
                addLabel="New Ingredient"
            />

            <Dialog
                open={dialogOpen}
                title={editItem.id ? 'Edit Ingredient' : 'New Ingredient'}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleSave}
            >
                <DynamicForm
                    entityName="Ingredient"
                    mode={editItem.id ? 'edit' : 'save'}
                    values={editItem}
                    onChange={(field, value) =>
                        setEditItem((s) => ({
                            ...s,
                            [field]: value,
                        }))
                    }
                    errors={formErrors}
                />
            </Dialog>
        </div>
    )
}