import { useEffect, useState } from 'react'
import { useNotification } from '../../components/ui/Notification'
import { shoppingCartsApi, type CartDto, type CartItemDto } from '../../api/cookBook'
import { CustomSelect } from '../../components/fields/CustomSelect'
import styles from './ShoppingCartPage.module.css'

function NewCartDialog({ onCreated, onClose }: { onCreated: (cart: CartDto) => void; onClose: () => void }) {
  const { showError } = useNotification()
  const [name, setName] = useState('')

  const handleCreate = () => {
    if (!name.trim()) { showError('Enter a name'); return }
    shoppingCartsApi.create(name.trim())
      .then(r => { onCreated(r.data); onClose() })
      .catch(() => showError('Failed to create cart'))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>New Shopping Cart</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dialogBody}>
          <label className={styles.dialogLabel}>Name</label>
          <input className={styles.dialogInput} value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="e.g., Weekly shopping" autoFocus />
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handleCreate}>Create</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function ExportDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const handleCopy = () => navigator.clipboard?.writeText(text)
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Shopping List</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`${styles.btn} ${styles.primary}`} onClick={handleCopy}>Copy</button>
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>
        <div className={styles.dialogBody}>
          <pre className={styles.exportText}>{text}</pre>
        </div>
      </div>
    </div>
  )
}

function groupByCategory(items: CartItemDto[]): [string, CartItemDto[]][] {
  const map = new Map<string, CartItemDto[]>()
  for (const item of items) {
    const key = item.sourceRecipeName ?? 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function ShoppingCartPage() {
  const { showSuccess, showError } = useNotification()
  const [carts, setCarts] = useState<CartDto[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [cart, setCart] = useState<CartDto | null>(null)
  const [loadingCarts, setLoadingCarts] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [exportText, setExportText] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const loadCarts = () => {
    setLoadingCarts(true)
    shoppingCartsApi.getAll()
      .then(r => {
        setCarts(r.data)
        if (!selectedId && r.data.length) {
          const first = r.data.find(c => !c.archived) ?? r.data[0]
          setSelectedId(first.id)
        }
      })
      .catch(() => showError('Failed to load carts'))
      .finally(() => setLoadingCarts(false))
  }

  const loadCart = () => {
    if (!selectedId) { setCart(null); return }
    shoppingCartsApi.getById(selectedId)
      .then(r => setCart(r.data))
      .catch(() => showError('Failed to load cart'))
  }

  useEffect(loadCarts, [])
  useEffect(loadCart, [selectedId])

  const handleToggle = (itemId: string) => {
    if (!selectedId) return
    shoppingCartsApi.toggleItem(selectedId, itemId)
      .then(loadCart)
      .catch(() => showError('Failed'))
  }

  const handleArchive = () => {
    if (!selectedId) return
    if (!confirm('Archive this cart?')) return
    shoppingCartsApi.archive(selectedId)
      .then(() => { showSuccess('Archived'); setSelectedId(''); loadCarts() })
      .catch(() => showError('Failed'))
  }

  const handleDelete = () => {
    if (!selectedId) return
    if (!confirm('Delete this cart permanently?')) return
    shoppingCartsApi.delete(selectedId)
      .then(() => { showSuccess('Deleted'); setSelectedId(''); loadCarts() })
      .catch(() => showError('Failed'))
  }

  const handleExport = () => {
    if (!selectedId) return
    shoppingCartsApi.export(selectedId)
      .then(r => setExportText(r.data))
      .catch(() => showError('Failed'))
  }

  const visibleCarts = showArchived ? carts : carts.filter(c => !c.archived)
  const allItems = cart?.items ?? []
  const bought = allItems.filter(i => i.purchased).length
  const groups = groupByCategory(allItems.filter(i => !i.purchased))
  const doneItems = allItems.filter(i => i.purchased)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <CustomSelect
          className={styles.cartSelect}
          options={[{ value: '', label: 'Select cart...' }, ...visibleCarts.map(c => ({ value: c.id, label: `${c.archived ? '[Archived] ' : ''}${c.name}` }))]}
          value={selectedId}
          onChange={setSelectedId}
          disabled={loadingCarts}
        />
        <button className={`${styles.btn} ${styles.primary}`} onClick={() => setShowNew(true)}>+ New Cart</button>
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        <div style={{ flex: 1 }} />
        {cart && <>
          <button className={styles.btn} onClick={handleExport}>Export</button>
          {!cart.archived && (
            <button className={`${styles.btn} ${styles.warning}`} onClick={handleArchive}>Archive</button>
          )}
          <button className={`${styles.btn} ${styles.danger}`} onClick={handleDelete}>Delete</button>
        </>}
      </div>

      {!cart && !loadingCarts && (
        <div className={styles.empty}>Select or create a shopping cart.</div>
      )}

      {cart && (
        <div className={styles.cartContent}>
          <div className={styles.progressBar}>
            <div className={styles.progress} style={{ width: allItems.length ? `${(bought / allItems.length) * 100}%` : '0%' }} />
          </div>
          <div className={styles.cartMeta}>
            <span className={styles.cartName}>{cart.name}</span>
            <span className={styles.cartCount}>{bought} / {allItems.length} items</span>
          </div>

          <div className={styles.itemList}>
            {/* Pending items grouped by recipe */}
            {groups.map(([groupName, items]) => (
              <div key={groupName} className={styles.group}>
                <div className={styles.groupLabel}>{groupName}</div>
                {items.map(item => (
                  <CartItemRow key={item.id} item={item} onToggle={handleToggle} />
                ))}
              </div>
            ))}

            {/* Done items */}
            {doneItems.length > 0 && (
              <div className={styles.group}>
                <div className={`${styles.groupLabel} ${styles.doneLabel}`}>Done ({doneItems.length})</div>
                {doneItems.map(item => (
                  <CartItemRow key={item.id} item={item} onToggle={handleToggle} done />
                ))}
              </div>
            )}

            {allItems.length === 0 && (
              <div className={styles.emptyCart}>Cart is empty. Add recipes from the recipe detail page.</div>
            )}
          </div>
        </div>
      )}

      {showNew && (
        <NewCartDialog
          onCreated={c => { setCarts(prev => [...prev, c]); setSelectedId(c.id) }}
          onClose={() => setShowNew(false)}
        />
      )}
      {exportText !== null && (
        <ExportDialog text={exportText} onClose={() => setExportText(null)} />
      )}
    </div>
  )
}

function CartItemRow({ item, onToggle, done = false }: {
  item: CartItemDto; onToggle: (id: string) => void; done?: boolean
}) {
  return (
    <div className={`${styles.itemRow} ${done ? styles.itemDone : ''}`} onClick={() => onToggle(item.id)}>
      <div className={`${styles.checkbox} ${done ? styles.checked : ''}`}>
        {done ? '✓' : ''}
      </div>
      <div className={styles.itemInfo}>
        <span className={styles.itemName}>{item.ingredientName}</span>
        {item.quantity != null && (
          <span className={styles.itemQty}>{item.quantity} {item.unitDisplayName ?? ''}</span>
        )}
      </div>
    </div>
  )
}
