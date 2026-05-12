import {useEffect, useState} from 'react'
import type {Column} from '../../components/table/DataTable'
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
import {DynamicForm} from "../../components/ui/DynamicForm.tsx";

const COLUMNS: Column<IngredientDto>[] = [
    {key: 'name', header: 'Name', sortable: true},
    {
        key: 'category',
        header: 'Category',
        sortable: true,
        render: (row) =>
            row.category
                ? <span className={styles.catBadge}>{row.category}</span>
                : '—',
    },
    {key: 'kcalPer100g', header: 'Kcal', sortable: true},
    {key: 'proteinPer100g', header: 'Protein', sortable: true},
    {key: 'fatPer100g', header: 'Fat', sortable: true},
    {key: 'carbsPer100g', header: 'Carbs', sortable: true},
    {key: 'fiberPer100g', header: 'Fiber', sortable: true},
]

const EMPTY: Partial<IngredientDto> = {
    name: '',
    category: '',
    kcalPer100g: 0,
    proteinPer100g: 0,
    fatPer100g: 0,
    carbsPer100g: 0,
    fiberPer100g: 0,
}

export function IngredientsPage() {
    const {showSuccess, showError} = useNotification()
    const [formErrors] = useState<Record<string, string>>({})


    const table = useTableState(
        {sortBy: 'name', sortDir: 'asc'},
        'ingredients',
    )

    const {filters, setFilter, clearFilters} = useEntityFilters()

    const [rows, setRows] = useState<IngredientDto[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<Partial<IngredientDto>>({
        ...EMPTY,
    })

    const load = () => {
        setLoading(true)

        ingredientsApi
            .getAll({
                page: table.page,
                size: table.pageSize,
                ...filters,
            })
            .then((res) => {
                const p = toPage(res.data)
                setRows(p.content)
                setTotal(p.totalElements)
            })
            .catch(() => showError('Failed to load ingredients'))
            .finally(() => setLoading(false))
    }

    useEffect(load, [
        table.page,
        table.pageSize,
        JSON.stringify(filters),
    ])

    const openEdit = (item: Partial<IngredientDto>) => {
        setEditItem({
            ...EMPTY,
            ...item,
        })

        setDialogOpen(true)
    }

    const actions = useTableActions<IngredientDto>({
        onDelete: async (selected) => {
            for (const r of selected) {
                await ingredientsApi.delete(r.id)
            }
        },
        onEdit: openEdit,
        onRefresh: load,
    })

    const handleSave = async () => {
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
                onRowClick={openEdit}
                onAdd={() => openEdit({...EMPTY})}
                addLabel="New Ingredient"
            />

            <Dialog
                open={dialogOpen}
                title={
                    editItem.id
                        ? 'Edit Ingredient'
                        : 'New Ingredient'
                }
                onClose={() => setDialogOpen(false)}
                onConfirm={handleSave}>
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