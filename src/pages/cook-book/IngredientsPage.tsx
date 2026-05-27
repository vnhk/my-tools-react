import {useEffect, useRef, useState} from 'react'
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

    // ── Scan states ───────────────────────────────────────────────────────────

    const [scanOpen, setScanOpen] = useState(false)
    const [scanPreview, setScanPreview] = useState<string | null>(null)
    const [scanResult, setScanResult] = useState<Partial<IngredientDto> | null>(null)
    const [scanErrors, setScanErrors] = useState<Record<string, string>>({})

    const scanInputRef = useRef<HTMLInputElement>(null)

    const load = () => setRefreshKey(k => k + 1)

    const COLUMNS = buildColumnsFromConfig<IngredientDto>(
        'Ingredient',
        {
            category: {
                render: (row) =>
                    row.category
                        ? <span className={styles.catBadge}>{row.category}</span>
                        : '—',
            }
        },
    )

    useEffect(() => {
        let cancelled = false

        setLoading(true)

        ingredientsApi.list({
            page: table.page,
            size: table.pageSize,
            sort: table.sortBy,
            direction: table.sortDir,
            ...filters,
        })
            .then((res) => {
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
        table.page,
        table.pageSize,
        table.sortBy,
        table.sortDir,
        refreshKey,
        JSON.stringify(filters),
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

    // ── Save normal form ─────────────────────────────────────────────────────

    const handleSave = async () => {
        const errors = validateFields(
            'Ingredient',
            editItem as Record<string, unknown>,
        )

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

    // ── Scan image ───────────────────────────────────────────────────────────

    const handleCaptureImage = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0]

        if (!file) return

        const reader = new FileReader()

        reader.onload = async (event) => {
            const base64 = event.target?.result as string

            setScanPreview(base64)

            await handleScanNutrition(base64)
        }

        reader.readAsDataURL(file)
    }

    // ── Scan API call ────────────────────────────────────────────────────────

    const handleScanNutrition = async (imageBase64: string) => {
        try {
            const result =
                await ingredientsApi.scanNutritionTable(imageBase64)

            const ingredient = (result as any)?.data ?? result

            setScanResult(ingredient)
            setScanErrors({})
            setScanOpen(true)

            showSuccess('Nutrition table scanned')
        } catch {
            showError('Failed to scan nutrition table')
        }
    }

    // ── Save scanned ingredient ──────────────────────────────────────────────

    const handleSaveScannedIngredient = async () => {
        if (!scanResult) return

        const errors = validateFields(
            'Ingredient',
            scanResult as Record<string, unknown>,
        )

        if (Object.keys(errors).length > 0) {
            setScanErrors(errors)
            return
        }

        try {
            await ingredientsApi.create(scanResult)

            showSuccess('Ingredient saved')

            setScanOpen(false)
            setScanResult(null)
            setScanErrors({})

            load()
        } catch {
            showError('Failed to save ingredient')
        }
    }

    return (
        <div className={styles.page}>

            {/* ── Scan button ─────────────────────────────────────────────── */}

            <div style={{marginBottom: 12}}>
                <button
                    className={styles.scanBtn}
                    onClick={() => scanInputRef.current?.click()}
                >
                    Scan Nutrition Table
                </button>

                <input
                    ref={scanInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{display: 'none'}}
                    onChange={handleCaptureImage}
                />
            </div>

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
                    setEditItem({...item})
                    setFormErrors({})
                    setDialogOpen(true)
                }}
                onAdd={() => {
                    setEditItem({})
                    setFormErrors({})
                    setDialogOpen(true)
                }}
                addLabel="New Ingredient"
            />

            {/* ── Normal dialog ───────────────────────────────────────────── */}

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

            {/* ── Scan dialog ─────────────────────────────────────────────── */}

            <Dialog
                open={scanOpen}
                title="Scanned Ingredient"
                onClose={() => {
                    setScanOpen(false)
                    setScanResult(null)
                    setScanErrors({})
                }}
                onConfirm={handleSaveScannedIngredient}
            >
                {scanPreview && (
                    <img
                        src={scanPreview}
                        alt="Nutrition table"
                        style={{
                            width: '100%',
                            maxHeight: 240,
                            objectFit: 'contain',
                            marginBottom: 16,
                            borderRadius: 8,
                        }}
                    />
                )}

                {scanResult && (
                    <DynamicForm
                        entityName="Ingredient"
                        mode="save"
                        values={scanResult}
                        onChange={(field, value) =>
                            setScanResult(prev => ({
                                ...(prev ?? {}),
                                [field]: value,
                            }))
                        }
                        errors={scanErrors}
                    />
                )}
            </Dialog>
        </div>
    )
}