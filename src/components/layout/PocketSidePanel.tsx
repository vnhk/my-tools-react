import { useEffect, useRef, useState } from 'react'
import { pocketsApi, pocketItemsApi, type PocketItem } from '../../api/pockets'
import { toPage } from '../../api/crud'
import { Dialog } from '../ui/Dialog'
import { RichTextEditor } from '../ui/RichTextEditor'
import { TextField } from '../fields/TextField'
import { Button } from '../ui/Button'
import { CustomSelect } from '../fields/CustomSelect'
import styles from './PocketSidePanel.module.css'

// ── Item dialog ────────────────────────────────────────────────────────────────

interface ItemDialogProps {
  item: PocketItem
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function ItemDialog({ item, onClose, onSaved, onDeleted }: ItemDialogProps) {
  const [step, setStep] = useState<'password' | 'edit'>(item.encrypted ? 'password' : 'edit')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState(item.encrypted ? '' : (item.content ?? ''))
  const [encrypted, setEncrypted] = useState(item.encrypted ?? false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleUnlock = async () => {
    setError('')
    try {
      const res = await pocketItemsApi.decrypt(item.id, password)
      setContent(res.data.content)
      setStep('edit')
    } catch {
      setError('Wrong password')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await pocketItemsApi.update(item.id, { content, encrypted })
      onSaved()
      onClose()
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.summary}"?`)) return
    try {
      await pocketItemsApi.delete(item.id)
      onDeleted()
      onClose()
    } catch {
      setError('Failed to delete')
    }
  }

  return (
    <Dialog
      open
      title={item.summary}
      onClose={onClose}
      onConfirm={step === 'password' ? handleUnlock : handleSave}
      confirmLabel={step === 'password' ? 'Unlock' : (saving ? 'Saving…' : 'Save')}
      width="700px"
    >
      {step === 'password' ? (
        <>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="Enter decryption password"
          />
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: '4px 0' }}>{error}</p>}
        </>
      ) : (
        <>
          <RichTextEditor value={content} onChange={setContent} height="50vh" />
          <div className={styles.dialogActions}>
            <label className={styles.encryptRow}>
              <input
                type="checkbox"
                checked={encrypted}
                onChange={(e) => setEncrypted(e.target.checked)}
              />
              Encrypted
            </label>
            <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
          </div>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: '4px 0' }}>{error}</p>}
        </>
      )}
    </Dialog>
  )
}

// ── Pocket column ──────────────────────────────────────────────────────────────

interface PocketColumnProps {
  initialName: string
  allNames: string[]
}

function PocketColumn({ initialName, allNames }: PocketColumnProps) {
  const [selected, setSelected] = useState(initialName)
  const [items, setItems] = useState<PocketItem[]>([])
  const [dialogItem, setDialogItem] = useState<PocketItem | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const load = (name = selected) => {
    pocketItemsApi
      .getByPocket(name, { size: 1000, sort: 'orderInPocket', direction: 'asc' })
      .then((res) => setItems(toPage(res.data).content))
      .catch(() => {})
  }

  useEffect(() => { load(selected) }, [selected])

  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null) }

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return

    const reordered = [...items]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setItems(reordered)
    setDragIndex(null)
    setDragOverIndex(null)

    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].orderInPocket !== i) {
          await pocketItemsApi.update(reordered[i].id, { orderInPocket: i })
        }
      }
    } catch {
      load()
    }
  }

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <CustomSelect
          options={allNames.map((n) => ({ value: n, label: n }))}
          value={selected}
          onChange={setSelected}
        />
      </div>

      <div className={styles.itemsList}>
        {items.map((item, i) => (
          <div
            key={item.id}
            className={[
              styles.card,
              dragIndex === i ? styles.dragging : '',
              dragOverIndex === i && dragIndex !== i ? styles.dragOver : '',
            ].join(' ')}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
          >
            <p className={styles.cardTitle}>{item.summary}</p>
            {item.encrypted && <span className={styles.encryptedBadge}>🔒 encrypted</span>}
            <button className={styles.infoBtn} onClick={() => setDialogItem(item)} title="Open">ℹ</button>
          </div>
        ))}
      </div>

      {dialogItem && (
        <ItemDialog
          item={dialogItem}
          onClose={() => setDialogItem(null)}
          onSaved={() => { setDialogItem(null); load() }}
          onDeleted={() => { setDialogItem(null); load() }}
        />
      )}
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function PocketSidePanel() {
  const [open, setOpen] = useState(false)
  const [pocketNames, setPocketNames] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    pocketsApi
      .getAll({ size: 1000, sort: 'name', direction: 'asc' })
      .then((res) => setPocketNames(toPage(res.data).content.map((p) => p.name)))
      .catch(() => {})
  }, [open])

  return (
    <>
      <button className={styles.toggleBtn} onClick={() => setOpen((o) => !o)} title="Pocket">
        📌
      </button>

      {open && (
        <div className={styles.overlay}>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            {pocketNames.map((name) => (
              <PocketColumn key={name} initialName={name} allNames={pocketNames} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
