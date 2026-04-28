import { useEffect, useState } from 'react'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { ingredientsApi, type IngredientDto } from '../../api/cookBook'
import styles from './IngredientsPage.module.css'

const EMPTY: Partial<IngredientDto> = {
  name: '', category: '',
  kcalPer100g: undefined, proteinPer100g: undefined, fatPer100g: undefined,
  carbsPer100g: undefined, fiberPer100g: undefined,
}

export function IngredientsPage() {
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'ingredients')
  const [allRows, setAllRows] = useState<IngredientDto[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Record<string, unknown>>({ ...EMPTY })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const columns = buildColumnsFromConfig<IngredientDto>('Ingredient', {
    category: {
      render: (row) => row.category
        ? <span className={styles.catBadge}>{row.category}</span>
        : <span className={styles.muted}>—</span>,
    },
    kcalPer100g: { render: (row) => row.kcalPer100g ?? '—' },
    proteinPer100g: { render: (row) => row.proteinPer100g ?? '—' },
    fatPer100g: { render: (row) => row.fatPer100g ?? '—' },
    carbsPer100g: { render: (row) => row.carbsPer100g ?? '—' },
    fiberPer100g: { render: (row) => row.fiberPer100g ?? '—' },
  })

  const load = () => {
    setLoading(true)
    ingredientsApi.search('', 0, 5000)
      .then(r => setAllRows(r.data))
      .catch(() => showError('Failed to load ingredients'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = allRows
    .filter(r =>
      !table.search ||
      r.name.toLowerCase().includes(table.search.toLowerCase()) ||
      (r.category ?? '').toLowerCase().includes(table.search.toLowerCase())
    )
    .sort((a, b) => {
      const key = table.sortBy as keyof IngredientDto
      const av = a[key] ?? ''
      const bv = b[key] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return table.sortDir === 'asc' ? cmp : -cmp
    })

  const total = filtered.length
  const pageRows = filtered.slice(table.page * table.pageSize, (table.page + 1) * table.pageSize)

  const openEdit = (item: Partial<IngredientDto>) => {
    setEditItem({ ...EMPTY, ...item } as Record<string, unknown>)
    setFormErrors({})
    setDialogOpen(true)
  }

  const actions = useTableActions<IngredientDto>({
    onDelete: async (selected) => { for (const r of selected) await ingredientsApi.delete(r.id) },
    onEdit: openEdit,
    onRefresh: load,
  })

  const handleSave = async () => {
    const errors = validateFields('Ingredient', editItem)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      if (editItem.id) {
        await ingredientsApi.update(editItem.id as string, editItem)
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
      <DataTable
        columns={columns}
        rows={pageRows}
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
        searchPlaceholder="Search ingredients…"
        actions={actions}
        onRowClick={openEdit}
        onAdd={() => openEdit({ ...EMPTY })}
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
          onChange={(field, value) => setEditItem(s => ({ ...s, [field]: value }))}
          errors={formErrors}
        />
      </Dialog>
    </div>
  )
}
