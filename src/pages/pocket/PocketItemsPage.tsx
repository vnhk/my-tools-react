import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { Checkbox } from '../../components/fields/Checkbox'
import { RichTextEditor } from '../../components/ui/RichTextEditor'
import { TabNav } from '../../components/layout/TabNav'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { pocketItemsApi, type PocketItem } from '../../api/pockets'
import { toPage } from '../../api/crud'
import styles from './PocketItemsPage.module.css'

function truncate(str: string, n = 80) {
  if (!str) return ''
  const text = str.replace(/<[^>]+>/g, '')
  return text.length > n ? text.slice(0, n) + '…' : text
}

const buildColumns = (onDecrypt: (item: PocketItem) => void) => [
  { key: 'summary', header: 'Summary', sortable: true },
  {
    key: 'content',
    header: 'Content',
    render: (row: PocketItem) =>
      row.encrypted ? (
        <span className={styles.encryptedBadge}>🔒 encrypted</span>
      ) : (
        <span className={styles.contentPreview}>{truncate(row.content)}</span>
      ),
  },
  {
    key: 'encrypted',
    header: 'Encrypted',
    render: (row: PocketItem) =>
      row.encrypted ? (
        <button className={styles.decryptBtn} onClick={(e) => { e.stopPropagation(); onDecrypt(row) }}>
          🔓 Decrypt
        </button>
      ) : '—',
  },
  { key: 'orderInPocket', header: 'Order', sortable: true },
  { key: 'modificationDate', header: 'Modified', sortable: true },
]

const EMPTY_ITEM: Partial<PocketItem> = { summary: '', content: '', encrypted: false, orderInPocket: 0 }

export function PocketItemsPage() {
  const { pocketName } = useParams<{ pocketName: string }>()
  const { showSuccess, showError } = useNotification()
  const decodedName = decodeURIComponent(pocketName ?? '')

  const table = useTableState({ sortBy: 'orderInPocket', sortDir: 'asc' }, `pocket-items-${decodedName}`)
  const [rows, setRows] = useState<PocketItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<PocketItem>>(EMPTY_ITEM)

  const [decryptOpen, setDecryptOpen] = useState(false)
  const [decryptItem, setDecryptItem] = useState<PocketItem | null>(null)
  const [decryptPassword, setDecryptPassword] = useState('')
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null)

  const load = () => {
    if (!decodedName) return
    setLoading(true)
    pocketItemsApi
      .getByPocket(decodedName, { page: table.page, size: table.pageSize, sort: table.sortBy, direction: table.sortDir })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [decodedName, table.page, table.pageSize, table.sortBy, table.sortDir])

  const actions = useTableActions<PocketItem>({
    onDelete: async (selected) => { for (const r of selected) await pocketItemsApi.delete(r.id) },
    onEdit: (item) => { setEditItem(item); setEditOpen(true) },
    onRefresh: load,
  })

  const handleSave = async () => {
    if (!editItem.summary?.trim()) { showError('Summary is required'); return }
    try {
      if (editItem.id) {
        await pocketItemsApi.update(editItem.id, editItem)
      } else {
        await pocketItemsApi.create({ ...editItem, pocketName: decodedName } as PocketItem & { pocketName: string })
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

  const openDecrypt = (item: PocketItem) => {
    setDecryptItem(item)
    setDecryptedContent(null)
    setDecryptPassword('')
    setDecryptOpen(true)
  }

  const tabs = [
    { path: '/pocket', label: '← Pockets' },
    { path: `/pocket/${encodeURIComponent(decodedName)}`, label: decodedName },
  ]

  return (
    <div className={styles.page}>
      <TabNav tabs={tabs} />

      <DataTable
        columns={buildColumns(openDecrypt)}
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
        onRowClick={(row) => { setEditItem(row); setEditOpen(true) }}
        onAdd={() => { setEditItem({ ...EMPTY_ITEM, orderInPocket: rows.length }); setEditOpen(true) }}
        addLabel="New Item"
      />

      {/* Edit / Create dialog */}
      <Dialog
        open={editOpen}
        title={editItem.id ? 'Edit Item' : 'New Item'}
        onClose={() => setEditOpen(false)}
        onConfirm={handleSave}
        confirmLabel="Save"
        width="700px"
      >
        <div className={styles.form}>
          <TextField
            label="Summary"
            value={editItem.summary ?? ''}
            onChange={(e) => setEditItem((s) => ({ ...s, summary: e.target.value }))}
            required
            autoFocus
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
          {!editItem.encrypted && (
            <div className={styles.editorWrap}>
              <span className={styles.editorLabel}>Content</span>
              <RichTextEditor
                value={editItem.content ?? ''}
                onChange={(html) => setEditItem((s) => ({ ...s, content: html }))}
                height="300px"
                placeholder="Write something…"
              />
            </div>
          )}
        </div>
      </Dialog>

      {/* Decrypt dialog */}
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
    </div>
  )
}
