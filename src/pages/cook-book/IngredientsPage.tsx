import { useEffect, useState } from 'react'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { SelectField } from '../../components/fields/SelectField'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { ingredientsApi, type IngredientDto } from '../../api/cookBook'
import type { Column } from '../../components/table/DataTable'
import styles from './IngredientsPage.module.css'

const CATEGORIES = [
  'Dairy', 'Meat', 'Fish', 'Vegetables', 'Fruits', 'Spices',
  'Grains', 'Fats', 'Beverages', 'Sweets', 'Other',
]

const COLUMNS: Column<IngredientDto>[] = [
  { key: 'name', header: 'Name', sortable: true },
  {
    key: 'category',
    header: 'Category',
    sortable: true,
    render: (row) => row.category
      ? <span className={styles.catBadge}>{row.category}</span>
      : <span className={styles.muted}>—</span>,
  },
  { key: 'kcalPer100g', header: 'Kcal / 100g', render: (row) => row.kcalPer100g ?? '—' },
  { key: 'proteinPer100g', header: 'Protein / 100g', render: (row) => row.proteinPer100g ?? '—' },
  { key: 'fatPer100g', header: 'Fat / 100g', render: (row) => row.fatPer100g ?? '—' },
  { key: 'carbsPer100g', header: 'Carbs / 100g', render: (row) => row.carbsPer100g ?? '—' },
  { key: 'fiberPer100g', header: 'Fiber / 100g', render: (row) => row.fiberPer100g ?? '—' },
]

type EditState = Partial<IngredientDto>

const EMPTY: EditState = {
  name: '', icon: '', category: '',
  kcalPer100g: undefined, proteinPer100g: undefined, fatPer100g: undefined,
  carbsPer100g: undefined, fiberPer100g: undefined,
}

export function IngredientsPage() {
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'name', sortDir: 'asc' }, 'ingredients')
  const [allRows, setAllRows] = useState<IngredientDto[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<EditState>({ ...EMPTY })

  const load = () => {
    setLoading(true)
    ingredientsApi.search('', 0, 5000)
      .then(r => setAllRows(r.data))
      .catch(() => showError('Failed to load ingredients'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Client-side filter + sort + page
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
    setEditItem({ ...EMPTY, ...item })
    setDialogOpen(true)
  }

  const actions = useTableActions<IngredientDto>({
    onDelete: async (selected) => {
      for (const r of selected) await ingredientsApi.delete(r.id)
    },
    onEdit: openEdit,
    onRefresh: load,
  })

  const set = (field: keyof EditState, value: unknown) =>
    setEditItem(s => ({ ...s, [field]: value }))

  const handleSave = async () => {
    if (!editItem.name?.trim()) { showError('Name is required'); return }
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
      <DataTable
        columns={COLUMNS}
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
        width="520px"
      >
        <div className={styles.form}>
          <div className={styles.row}>
            <TextField
              label="Name"
              value={editItem.name ?? ''}
              onChange={e => set('name', e.target.value)}
              autoFocus
            />
            <TextField
              label="Icon"
              value={editItem.icon ?? ''}
              onChange={e => set('icon', e.target.value)}
              placeholder="e.g. 🥛"
            />
          </div>
          <SelectField
            label="Category"
            value={editItem.category ?? ''}
            options={[{ value: '', label: '— None —' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
            onChange={e => set('category', e.target.value)}
          />
          <div className={styles.macroRow}>
            <NumberField label="Kcal / 100g" value={editItem.kcalPer100g ?? ''}
              onChange={v => set('kcalPer100g', v === '' ? null : v)} min={0} />
            <NumberField label="Protein / 100g" value={editItem.proteinPer100g ?? ''}
              onChange={v => set('proteinPer100g', v === '' ? null : v)} min={0} />
            <NumberField label="Fat / 100g" value={editItem.fatPer100g ?? ''}
              onChange={v => set('fatPer100g', v === '' ? null : v)} min={0} />
            <NumberField label="Carbs / 100g" value={editItem.carbsPer100g ?? ''}
              onChange={v => set('carbsPer100g', v === '' ? null : v)} min={0} />
            <NumberField label="Fiber / 100g" value={editItem.fiberPer100g ?? ''}
              onChange={v => set('fiberPer100g', v === '' ? null : v)} min={0} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
