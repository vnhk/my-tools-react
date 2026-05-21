import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DataTable, type TableAction } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { buildColumnsFromConfig } from '../../components/table/configColumns'
import { NumberField } from '../../components/fields/NumberField'
import { Checkbox } from '../../components/fields/Checkbox'
import { RichTextEditor } from '../../components/ui/RichTextEditor'
import { TextField } from '../../components/fields/TextField'
import { SelectField } from '../../components/fields/SelectField'
import { TabNav } from '../../components/layout/TabNav'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useEntityFilters } from '../../hooks/useEntityFilters'
import { useNotification } from '../../components/ui/Notification'
import { EntityFilters } from '../../components/ui/EntityFilters'
import { ImportExportBar } from '../../components/ui/ImportExportBar'
import { pocketItemsApi, pocketsApi, type PocketItem, type Pocket } from '../../api/pockets'
import { toPage } from '../../api/crud'
import styles from './PocketItemsPage.module.css'

const EXTRA_COLUMNS = [
  { key: 'orderInPocket', header: 'Order', sortable: true },
  { key: 'modificationDate', header: 'Modified', sortable: true },
]

const EMPTY_ITEM: Partial<PocketItem> = { summary: '', content: '', encrypted: false, orderInPocket: 0 }

export function PocketItemsPage() {
  const { pocketName } = useParams<{ pocketName: string }>()
  const { showSuccess, showError } = useNotification()
  const decodedName = decodeURIComponent(pocketName ?? '')

  const table = useTableState({ sortBy: 'orderInPocket', sortDir: 'asc' }, `pocket-items-${decodedName}`)
  const { filters, setFilter, clearFilters } = useEntityFilters()
  const [rows, setRows] = useState<PocketItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<PocketItem>>(EMPTY_ITEM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [editUnlocked, setEditUnlocked] = useState(false)
  const [editPassword, setEditPassword] = useState('')
  const [editUnlockedContent, setEditUnlockedContent] = useState<string | null>(null)

  const [decryptOpen, setDecryptOpen] = useState(false)
  const [decryptItem, setDecryptItem] = useState<PocketItem | null>(null)
  const [decryptPassword, setDecryptPassword] = useState('')
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null)

  const [moveToPocketOpen, setMoveToPocketOpen] = useState(false)
  const [selectedItemsToMove, setSelectedItemsToMove] = useState<PocketItem[]>([])
  const [targetPocketId, setTargetPocketId] = useState<string>('')
  const [pockets, setPockets] = useState<Pocket[]>([])

  useEffect(() => {
    if (moveToPocketOpen) {
      pocketsApi.getAll({ size: 1000 }).then((res) => {
        const p = toPage(res.data)
        setPockets(p.content.filter(pkt => pkt.name !== decodedName))
      })
    }
  }, [moveToPocketOpen, decodedName])

  const openDecrypt = (item: PocketItem) => {
    setDecryptItem(item)
    setDecryptedContent(null)
    setDecryptPassword('')
    setDecryptOpen(true)
  }

  const columns = [
    ...buildColumnsFromConfig<PocketItem>('PocketItem', {
      content: {
        render: (row) => row.encrypted
          ? <span className={styles.encryptedBadge}>🔒 encrypted</span>
          : <span className={styles.contentPreview}>{row.content?.replace(/<[^>]+>/g, '').slice(0, 80)}</span>,
      },
    }),
    {
      key: 'encrypted',
      header: 'Encrypted',
      render: (row: PocketItem) => row.encrypted ? (
        <button className={styles.decryptBtn} onClick={(e) => { e.stopPropagation(); openDecrypt(row) }}>
          🔓 Decrypt
        </button>
      ) : '—',
    },
    ...EXTRA_COLUMNS,
  ]

  const load = () => {
    if (!decodedName) return
    setLoading(true)
    pocketItemsApi
      .getByPocket(decodedName, { page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir, ...filters })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [decodedName, table.page, table.pageSize, table.sortBy, table.sortDir, JSON.stringify(filters)])

  const openEdit = (item: Partial<PocketItem>) => {
    setEditItem(item)
    setFormErrors({})
    setEditUnlocked(!item.encrypted)
    setEditPassword('')
    setEditUnlockedContent(null)
    setEditOpen(true)
  }

  const handleUnlock = async () => {
    if (!editItem.id) return
    try {
      const res = await pocketItemsApi.decrypt(editItem.id, editPassword)
      setEditUnlockedContent(res.data.content)
      setEditItem((s) => ({ ...s, content: res.data.content }))
      setEditUnlocked(true)
      setEditPassword('')
    } catch {
      showError('Wrong password')
    }
  }

  const actions = useTableActions<PocketItem>({
    onDelete: async (selected) => { for (const r of selected) await pocketItemsApi.delete(r.id) },
    onEdit: openEdit,
    onRefresh: load,
  })

  const handleBulkMove = async () => {
    if (!targetPocketId) {
      showError('Please select a target pocket')
      return
    }
    const itemIds = selectedItemsToMove.map(item => item.id)
    try {
      await pocketItemsApi.bulkMove(itemIds, targetPocketId)
      showSuccess(`Moved ${itemIds.length} item(s) successfully`)
      setMoveToPocketOpen(false)
      setSelectedItemsToMove([])
      setTargetPocketId('')
      load()
    } catch {
      showError('Failed to move selected items')
    }
  }

  const allActions: TableAction<PocketItem>[] = [
    ...actions,
    {
      label: 'Move to Pocket',
      variant: 'secondary',
      requiresSelection: true,
      onClick: (selectedRows) => {
        setSelectedItemsToMove(selectedRows)
        setMoveToPocketOpen(true)
      }
    }
  ]

  const handleSave = async () => {
    const payload = editUnlockedContent !== null
      ? { ...editItem, content: editItem.content ?? editUnlockedContent }
      : editItem
    const errors = validateFields('PocketItem', payload as Record<string, unknown>, payload.id ? 'edit' : 'save')
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      if (payload.id) {
        await pocketItemsApi.update(payload.id, payload)
      } else {
        await pocketItemsApi.create({ ...payload, pocketName: decodedName } as PocketItem & { pocketName: string })
      }
      showSuccess('Saved')
      setEditOpen(false)
      load()
    } catch {
      showError('Failed to save item')
    }
  }

  const handleDecrypt = async () => {
    if (!decryptItem) return
    try {
      const res = await pocketItemsApi.decrypt(decryptItem.id, decryptPassword)
      setDecryptedContent(res.data.content)
      setDecryptPassword('')
    } catch {
      showError('Decryption failed — wrong password?')
    }
  }

  const tabs = [
    { path: '/pocket', label: '← Pockets' },
    { path: `/pocket/${encodeURIComponent(decodedName)}`, label: decodedName },
  ]

  return (
    <div className={styles.page}>
      <TabNav tabs={tabs} />
      <ImportExportBar
        exportUrl="/pocket-app/all-pocket-items/export"
        importUrl="/pocket-app/all-pocket-items/import"
        entityLabel="Pocket Items"
        onImportSuccess={load}
        filters={filters}
      />
      <EntityFilters
        entityName="PocketItem"
        filters={filters}
        onFiltersChange={setFilter}
        onClear={clearFilters}
      />
      <DataTable
        columns={columns}
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
        actions={allActions}
        onRowClick={(row) => openEdit(row)}
        onAdd={() => openEdit({ ...EMPTY_ITEM, orderInPocket: rows.length })}
        addLabel="New Item"
      />

      <Dialog
        open={editOpen}
        title={editItem.id ? 'Edit Item' : 'New Item'}
        onClose={() => setEditOpen(false)}
        onConfirm={editUnlocked ? handleSave : handleUnlock}
        confirmLabel={editUnlocked ? 'Save' : 'Unlock'}
        width="60vw"
        height="80vh"
      >
        {!editUnlocked ? (
          <TextField
            label="Password"
            type="password"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            autoFocus
            placeholder="Enter decryption password"
          />
        ) : (
          <div className={styles.form}>
            <DynamicForm
              entityName="PocketItem"
              mode={editItem.id ? 'edit' : 'save'}
              values={editItem as Record<string, unknown>}
              onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
              errors={formErrors}
            />
            <NumberField
              label="Order"
              value={editItem.orderInPocket ?? 0}
              onChange={(v) => setEditItem((s) => ({ ...s, orderInPocket: v === '' ? 0 : v }))}
            />
            <Checkbox
              label="Encrypted"
              checked={editItem.encrypted ?? false}
              onChange={(e) => setEditItem((s) => ({ ...s, encrypted: e.target.checked }))}
            />
          </div>
        )}
      </Dialog>

      <Dialog
        open={decryptOpen}
        title={`Decrypt: ${decryptItem?.summary ?? ''}`}
        onClose={() => { setDecryptOpen(false); setDecryptedContent(null) }}
        onConfirm={decryptedContent ? undefined : handleDecrypt}
        confirmLabel="Decrypt"
        width="620px"
      >
        {decryptedContent ? (
          <div className={styles.decryptedContent}>
            <RichTextEditor value={decryptedContent} readOnly height="300px" />
          </div>
        ) : (
          <TextField
            label="Password"
            type="password"
            value={decryptPassword}
            onChange={(e) => setDecryptPassword(e.target.value)}
            autoFocus
            placeholder="Enter decryption password"
          />
        )}
      </Dialog>

      <Dialog
        open={moveToPocketOpen}
        title="Move Selected Items to Another Pocket"
        onClose={() => { setMoveToPocketOpen(false); setSelectedItemsToMove([]) }}
        onConfirm={handleBulkMove}
        confirmLabel="Move"
        width="450px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p>Moving {selectedItemsToMove.length} item(s) to another pocket.</p>
          <SelectField
            label="Target Pocket"
            placeholder="Select a pocket..."
            value={targetPocketId}
            onChange={(e) => setTargetPocketId(e.target.value)}
            options={pockets.map((pkt) => ({ value: pkt.id, label: pkt.name }))}
            required
          />
        </div>
      </Dialog>
    </div>
  )
}
