import { useCallback, useEffect, useRef, useState } from 'react'
import { FaPlus, FaChevronRight, FaTrash, FaBook } from 'react-icons/fa'
import { canvasApi, type CanvasDetail, type CanvasItem } from '../../api/canvas'
import { RichTextEditor } from '../../components/ui/RichTextEditor'
import { Dialog } from '../../components/ui/Dialog'
import { useNotification } from '../../components/ui/Notification'
import styles from './CanvasPage.module.css'

const UNCATEGORIZED = '(No Category)'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function CanvasPage() {
  const { showSuccess, showError } = useNotification()

  const [items, setItems] = useState<CanvasItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDetail, setActiveDetail] = useState<CanvasDetail | null>(null)
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newNameError, setNewNameError] = useState('')

  const [categoryEditOpen, setCategoryEditOpen] = useState(false)
  const [editCategory, setEditCategory] = useState('')

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContent = useRef<string | null>(null)

  const loadList = useCallback(() => {
    canvasApi.list().then((r) => {
      setItems(Array.isArray(r.data) ? r.data : [])
    })
  }, [])

  useEffect(() => { loadList() }, [loadList])

  // Auto-expand categories containing active page
  useEffect(() => {
    if (activeId) {
      const item = items.find((i) => i.id === activeId)
      const cat = item?.category || UNCATEGORIZED
      setOpenCategories((prev) => new Set([...prev, cat]))
    }
  }, [activeId, items])

  const loadDetail = (id: string) => {
    setActiveId(id)
    canvasApi.get(id).then((r) => setActiveDetail(r.data))
  }

  const handleContentChange = (html: string) => {
    if (!activeDetail) return
    setActiveDetail((prev) => prev ? { ...prev, content: html } : prev)
    pendingContent.current = html
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (activeDetail && pendingContent.current !== null) {
        canvasApi.update(activeDetail.id, { content: pendingContent.current }).then(() => {
          setSaveState('saved')
          pendingContent.current = null
          setTimeout(() => setSaveState('idle'), 2000)
        })
      }
    }, 2000)
  }

  const handleTitleBlur = () => {
    if (!activeDetail) return
    canvasApi.update(activeDetail.id, { name: activeDetail.name }).then(() => {
      setItems((prev) => prev.map((i) => i.id === activeDetail.id ? { ...i, name: activeDetail.name } : i))
    })
  }

  const handleCategoryConfirm = () => {
    if (!activeDetail) return
    const cat = editCategory.trim() || ''
    canvasApi.update(activeDetail.id, { category: cat }).then(() => {
      setActiveDetail((prev) => prev ? { ...prev, category: cat } : prev)
      setItems((prev) => prev.map((i) => i.id === activeDetail.id ? { ...i, category: cat } : i))
      setCategoryEditOpen(false)
    })
  }

  const handleNewPage = async () => {
    if (!newName.trim()) { setNewNameError('Name is required'); return }
    try {
      const res = await canvasApi.create(newName.trim(), newCategory.trim() || undefined)
      setNewDialogOpen(false)
      setNewName('')
      setNewCategory('')
      loadList()
      loadDetail(res.data.id)
    } catch {
      showError('Failed to create page')
    }
  }

  const handleDelete = async () => {
    if (!activeDetail) return
    if (!confirm(`Delete "${activeDetail.name}"?`)) return
    try {
      await canvasApi.delete(activeDetail.id)
      showSuccess('Page deleted')
      setActiveId(null)
      setActiveDetail(null)
      loadList()
    } catch {
      showError('Failed to delete page')
    }
  }

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  // Group items by category
  const safeItems = Array.isArray(items) ? items : []
  const filtered = search
    ? safeItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : safeItems

  const groups: Map<string, CanvasItem[]> = new Map()
  for (const item of filtered) {
    const cat = item.category || UNCATEGORIZED
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(item)
  }
  // Sort pages within each group by modification date desc
  for (const pages of groups.values()) {
    pages.sort((a, b) => (b.modificationDate ?? '').localeCompare(a.modificationDate ?? ''))
  }
  // Sort categories: real ones first alphabetically, uncategorized last
  const sortedCategories = [...groups.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1
    if (b === UNCATEGORIZED) return -1
    return a.localeCompare(b)
  })

  const saveIndicatorClass =
    saveState === 'saving' ? styles.saveIndicatorSaving :
    saveState === 'saved' ? styles.saveIndicatorSaved :
    styles.saveIndicator

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button
            className={styles.newPageBtn}
            onClick={() => { setNewName(''); setNewCategory(''); setNewNameError(''); setNewDialogOpen(true) }}
          >
            <FaPlus size={12} /> New Page
          </button>
          <input
            className={styles.sidebarSearch}
            placeholder="Search pages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.sidebarList}>
          {sortedCategories.map((cat) => (
            <div key={cat} className={styles.categoryGroup}>
              <div className={styles.categoryHeader} onClick={() => toggleCategory(cat)}>
                <FaChevronRight
                  size={10}
                  className={`${styles.categoryChevron} ${openCategories.has(cat) ? styles.categoryChevronOpen : ''}`}
                />
                <span className={styles.categoryName}>{cat}</span>
                <span className={styles.categoryCount}>{groups.get(cat)!.length}</span>
              </div>

              {openCategories.has(cat) && groups.has(cat) && groups.get(cat)!.map((page) => (
                <div
                  key={page.id}
                  className={`${styles.pageItem} ${page.id === activeId ? styles.pageItemActive : ''}`}
                  onClick={() => loadDetail(page.id)}
                >
                  <span className={styles.pageName}>{page.name}</span>
                  {page.modificationDate && (
                    <span className={styles.pageDate}>{formatDate(page.modificationDate)}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {sortedCategories.length === 0 && (
            <div className={styles.emptyState} style={{ padding: '24px 16px' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                No pages yet
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Editor */}
      <main className={styles.main}>
        {activeDetail ? (
          <>
            <div className={styles.editorHeader}>
              <input
                className={styles.titleInput}
                value={activeDetail.name}
                placeholder="Untitled"
                onChange={(e) => setActiveDetail((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                onBlur={handleTitleBlur}
              />
              <button
                className={styles.categoryPill}
                onClick={() => { setEditCategory(activeDetail.category || ''); setCategoryEditOpen(true) }}
                title="Change section"
              >
                {activeDetail.category || 'No Section'}
              </button>
              <span className={`${styles.saveIndicator} ${saveIndicatorClass}`}>
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
              </span>
              <button className={styles.deletePageBtn} onClick={handleDelete} title="Delete page">
                <FaTrash />
              </button>
            </div>

            <div className={styles.editorBody}>
              <RichTextEditor
                value={activeDetail.content ?? ''}
                onChange={handleContentChange}
                height="calc(100vh - 200px)"
                placeholder="Start writing…"
              />
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <FaBook className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Select a page or create a new one</p>
            <p className={styles.emptyHint}>Use the sidebar to navigate your notebooks</p>
          </div>
        )}
      </main>

      {/* New page dialog */}
      <Dialog
        open={newDialogOpen}
        title="New Page"
        onClose={() => setNewDialogOpen(false)}
        onConfirm={handleNewPage}
        confirmLabel="Create"
      >
        <div className={styles.formGroup}>
          <div>
            <label className={styles.fieldLabel}>Page name</label>
            <input
              className={styles.fieldInput}
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNewNameError('') }}
              placeholder="My Notes"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNewPage()}
            />
            {newNameError && <p className={styles.fieldError}>{newNameError}</p>}
          </div>
          <div>
            <label className={styles.fieldLabel}>Section (optional)</label>
            <input
              className={styles.fieldInput}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Work, Personal…"
            />
          </div>
        </div>
      </Dialog>

      {/* Category edit dialog */}
      <Dialog
        open={categoryEditOpen}
        title="Change Section"
        onClose={() => setCategoryEditOpen(false)}
        onConfirm={handleCategoryConfirm}
        confirmLabel="Save"
      >
        <div>
          <label className={styles.fieldLabel}>Section name</label>
          <input
            className={styles.fieldInput}
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            placeholder="Leave empty to remove"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCategoryConfirm()}
          />
        </div>
      </Dialog>
    </div>
  )
}
