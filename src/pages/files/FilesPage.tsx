import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import {
  FaFolder, FaFolderOpen, FaFile, FaFileImage, FaFileVideo, FaFilePdf,
  FaFileAlt, FaFileArchive, FaFileAudio, FaLock,
} from 'react-icons/fa'
import client from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/fields/TextField'
import { TextArea } from '../../components/fields/TextArea'
import { Checkbox } from '../../components/fields/Checkbox'
import { useNotification } from '../../components/ui/Notification'
import styles from './FilesPage.module.css'

interface FileItem {
  id: string
  filename: string
  path: string
  directory: boolean
  extension: string | null
  fileSize: number | null
  encrypted: boolean
  modificationDate: string | null
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'mkv'])
const TEXT_EXT  = new Set(['txt', 'md', 'json', 'xml', 'csv', 'log', 'yaml', 'yml', 'vtt', 'srt'])
const PDF_EXT   = new Set(['pdf'])

function FileIcon({ item, size = 16 }: { item: FileItem; size?: number }) {
  const ext = (item.extension ?? '').toLowerCase()
  const style = { flexShrink: 0 as const }
  if (item.directory) return <FaFolder size={size} color="var(--color-warning, #f59e0b)" style={style} />
  if (IMAGE_EXT.has(ext)) return <FaFileImage size={size} color="var(--color-primary, #a5b4fc)" style={style} />
  if (VIDEO_EXT.has(ext)) return <FaFileVideo size={size} color="var(--color-danger, #ef4444)" style={style} />
  if (PDF_EXT.has(ext)) return <FaFilePdf size={size} color="#f87171" style={style} />
  if (TEXT_EXT.has(ext)) return <FaFileAlt size={size} color="var(--color-text-secondary)" style={style} />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FaFileArchive size={size} color="#fbbf24" style={style} />
  if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) return <FaFileAudio size={size} color="#34d399" style={style} />
  return <FaFile size={size} color="var(--color-text-tertiary)" style={style} />
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// paths: root = "/", subdir = "/Folder/", nested = "/Folder/Sub/"
// always absolute (leading /) and trailing /
function dirPath(parentPath: string, folderName: string): string {
  return parentPath + folderName + '/'
}

function pathParts(path: string): string[] {
  if (path === '/') return []
  return path.replace(/^\//, '').replace(/\/$/, '').split('/')
}

function pathAtIndex(parts: string[], index: number): string {
  if (index < 0) return '/'
  return '/' + parts.slice(0, index + 1).join('/') + '/'
}

function getViewerType(item: FileItem): 'image' | 'video' | 'pdf' | 'text' | null {
  if (item.directory) return null
  const ext = (item.extension ?? '').toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (PDF_EXT.has(ext)) return 'pdf'
  if (TEXT_EXT.has(ext)) return 'text'
  return null
}

// ---- Upload Dialog ----
function UploadDialog({ currentPath, onClose, onUploaded }: {
  currentPath: string
  onClose: () => void
  onUploaded: () => void
}) {
  const { showNotification } = useNotification()
  const [tab, setTab] = useState<'file' | 'folder'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [folderFiles, setFolderFiles] = useState<FileList | null>(null)
  const [description, setDescription] = useState('')
  const [extract, setExtract] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const isZip = file?.name.toLowerCase().endsWith('.zip') ?? false

  const doUpload = async () => {
    const files = tab === 'file' ? (file ? [file] : []) : Array.from(folderFiles ?? [])
    if (files.length === 0) { showNotification('Please select a file', 'error'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append('files', f))
      await client.post('/files/upload', fd, {
        params: { path: currentPath, description, extract: tab === 'file' && extract },
      })
      showNotification('Uploaded successfully', 'success')
      onUploaded()
      onClose()
    } catch {
      showNotification('Upload failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) { setFile(dropped); setExtract(false) }
  }

  return (
    <Dialog open title="Upload" onClose={onClose} width="min(95vw, 520px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={doUpload} disabled={busy}>Upload</Button>
        </>
      }
    >
      {/* Tabs */}
      <div className={styles.uploadTabs}>
        <button className={tab === 'file' ? styles.uploadTabActive : styles.uploadTab} onClick={() => setTab('file')}>File</button>
        <button className={tab === 'folder' ? styles.uploadTabActive : styles.uploadTab} onClick={() => setTab('folder')}>Folder</button>
      </div>

      {tab === 'file' && (
        <div>
          <div
            className={`${styles.dropZone} ${dragging ? styles.dropZoneDragging : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {file ? (
              <span className={styles.dropZoneFile}>📎 {file.name}</span>
            ) : (
              <span className={styles.dropZonePlaceholder}>Click or drag a file here</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setExtract(false) }}
            />
          </div>
          {isZip && (
            <div style={{ marginTop: 10 }}>
              <Checkbox
                label="Extract ZIP contents"
                checked={extract}
                onChange={(e) => setExtract(e.target.checked)}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'folder' && (
        <div>
          <div
            className={styles.dropZone}
            onClick={() => folderInputRef.current?.click()}
          >
            {folderFiles && folderFiles.length > 0 ? (
              <span className={styles.dropZoneFile}>📁 {folderFiles.length} file(s) selected</span>
            ) : (
              <span className={styles.dropZonePlaceholder}>Click to select a folder</span>
            )}
            <input
              ref={folderInputRef}
              type="file"
              style={{ display: 'none' }}
              /* @ts-expect-error webkitdirectory */
              webkitdirectory=""
              multiple
              onChange={(e) => setFolderFiles(e.target.files)}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <TextArea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
    </Dialog>
  )
}

// ---- Move Dialog ----
function MoveDialog({
  item, currentPath, onClose, onMoved,
}: { item: FileItem; currentPath: string; onClose: () => void; onMoved: () => void }) {
  const { showNotification } = useNotification()
  const [browsePath, setBrowsePath] = useState('/')
  const [dirs, setDirs] = useState<FileItem[]>([])
  const [busy, setBusy] = useState(false)

  const loadDirs = useCallback((p: string) => {
    client.get<FileItem[]>('/files/directories', { params: { path: p } })
      .then((r) => { setDirs(r.data); setBrowsePath(p) })
      .catch(() => {})
  }, [])

  useEffect(() => { loadDirs('/') }, [loadDirs])

  const doMove = async () => {
    if (browsePath === currentPath) { showNotification('Already in this folder', 'error'); return }
    setBusy(true)
    try {
      await client.post(`/files/${item.id}/move`, null, { params: { destPath: browsePath } })
      showNotification('Moved successfully', 'success')
      onMoved()
      onClose()
    } catch {
      showNotification('Move failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const moveParts = pathParts(browsePath)

  return (
    <Dialog open title={`Move "${item.filename}"`} onClose={onClose} width="min(90vw,420px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={doMove} disabled={busy}>Move here</Button>
        </>
      }
    >
      <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={styles.breadcrumbPart} onClick={() => loadDirs('/')}>Root</button>
        {moveParts.map((p, i) => (
          <Fragment key={i}>
            <span className={styles.breadcrumbSep}>/</span>
            <button className={styles.breadcrumbPart} onClick={() => loadDirs(pathAtIndex(moveParts, i))}>
              {p}
            </button>
          </Fragment>
        ))}
      </div>
      <div className={styles.folderList}>
        {dirs.length === 0 && <div className={styles.empty} style={{ padding: '16px 0' }}>No subfolders</div>}
        {dirs.map((d) => (
          <button
            key={d.id}
            className={styles.folderItem}
            onClick={() => loadDirs(dirPath(browsePath, d.filename))}
          >
            <FaFolder size={14} color="var(--color-warning, #f59e0b)" style={{ marginRight: 6, flexShrink: 0 }} /> {d.filename}
          </button>
        ))}
      </div>
    </Dialog>
  )
}

const EDITABLE_EXT = new Set(['txt', 'md', 'json', 'xml', 'csv', 'log', 'yaml', 'yml', 'vtt', 'srt', 'js', 'ts', 'css', 'html'])
const MAX_EDITABLE_BYTES = 2 * 1024 * 1024

// ---- Inline File Viewer ----
function FileViewerDialog({ item, onClose, onUnlockNeeded }: {
  item: FileItem
  onClose: () => void
  onUnlockNeeded: (item: FileItem) => void
}) {
  const { showNotification } = useNotification()
  const vtype = getViewerType(item)
  const ext = (item.extension ?? '').toLowerCase()
  const isEditable = vtype === 'text' && EDITABLE_EXT.has(ext) && (item.fileSize == null || item.fileSize <= MAX_EDITABLE_BYTES) && !item.encrypted
  const [textContent, setTextContent] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [textError, setTextError] = useState(false)
  const streamUrl = `/file-storage-app/files/stream?uuid=${item.id}`
  const downloadUrl = `/file-storage-app/files/download?uuid=${item.id}`

  useEffect(() => {
    if (vtype === 'text') {
      if (item.encrypted) {
        fetch(streamUrl)
          .then((r) => {
            if (r.status === 401) { onUnlockNeeded(item); onClose(); return null }
            return r.text()
          })
          .then((t) => t !== null && setTextContent(t))
          .catch(() => setTextError(true))
      } else {
        fetch(downloadUrl)
          .then((r) => r.text())
          .then(setTextContent)
          .catch(() => setTextError(true))
      }
    }
  }, [item.id])

  const startEdit = () => {
    setEditValue(textContent ?? '')
    setEditMode(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await client.put(`/files/${item.id}/content`, editValue, {
        headers: { 'Content-Type': 'text/plain' },
      })
      setTextContent(editValue)
      setEditMode(false)
      showNotification('Saved', 'success')
    } catch {
      showNotification('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const srcUrl = item.encrypted ? streamUrl : downloadUrl

  return (
    <Dialog open title={item.filename} onClose={onClose} width="min(95vw, 900px)"
      footer={
        <>
          {vtype === 'text' && isEditable && !editMode && (
            <Button variant="secondary" onClick={startEdit}>✏ Edit</Button>
          )}
          {editMode && (
            <>
              <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button variant="primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
          {!editMode && <Button variant="ghost" onClick={onClose}>Close</Button>}
        </>
      }
    >
      <div className={styles.viewerBody}>
        {vtype === 'image' && (
          <img
            src={`/file-storage-app/files/thumbnail?uuid=${item.id}`}
            alt={item.filename}
            className={styles.viewerImage}
            onError={(e) => { (e.target as HTMLImageElement).src = downloadUrl }}
          />
        )}
        {vtype === 'video' && (
          <video controls className={styles.viewerVideo} src={srcUrl} />
        )}
        {vtype === 'pdf' && (
          <iframe src={srcUrl} className={styles.viewerPdf} title={item.filename} />
        )}
        {vtype === 'text' && (
          textError ? (
            <div className={styles.viewerTextError}>Failed to load file content.</div>
          ) : textContent === null ? (
            <div className={styles.viewerLoading}>Loading…</div>
          ) : editMode ? (
            <textarea
              className={styles.viewerTextEdit}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <pre className={styles.viewerText}>{textContent}</pre>
          )
        )}
      </div>
    </Dialog>
  )
}

// ---- Encryption Unlock Dialog ----
function UnlockDialog({ item, onClose, onUnlocked }: {
  item: FileItem
  onClose: () => void
  onUnlocked: () => void
}) {
  const { showNotification } = useNotification()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const doUnlock = async () => {
    if (!password.trim()) return
    setBusy(true)
    try {
      await client.post(`/files/${item.id}/unlock`, null, { params: { password } })
      showNotification('File unlocked', 'success')
      onUnlocked()
    } catch (e: any) {
      if (e?.response?.status === 403) {
        showNotification('Wrong password', 'error')
      } else {
        showNotification('Unlock failed', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open title={`Unlock "${item.filename}"`} onClose={onClose} width="min(90vw,380px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={doUnlock} disabled={busy || !password.trim()}>Unlock</Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 16 }}>
        This file is encrypted. Enter the password to decrypt it.
      </p>
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && doUnlock()}
        autoFocus
      />
    </Dialog>
  )
}

// ---- Main Page ----
export function FilesPage() {
  const { showNotification } = useNotification()
  const [path, setPath] = useState('/')
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null)
  const [newFolderDialog, setNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() =>
    (localStorage.getItem('filesViewMode') as 'list' | 'grid') ?? 'list'
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewItem, setViewItem] = useState<FileItem | null>(null)
  const [unlockItem, setUnlockItem] = useState<FileItem | null>(null)
  const [pendingViewAfterUnlock, setPendingViewAfterUnlock] = useState<FileItem | null>(null)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback((p: string) => {
    setLoading(true)
    setSearch('')
    setSelected(new Set())
    client.get<FileItem[]>('/files', { params: { path: p } })
      .then((r) => { setItems(r.data); setPath(p) })
      .catch(() => showNotification('Failed to load files', 'error'))
      .finally(() => setLoading(false))
  }, [showNotification])

  useEffect(() => { load('/') }, [load])

  const toggleViewMode = () => {
    const next = viewMode === 'list' ? 'grid' : 'list'
    setViewMode(next)
    localStorage.setItem('filesViewMode', next)
  }

  const navigate = (item: FileItem) => {
    if (item.directory) {
      load(dirPath(item.path, item.filename))
      return
    }
    if (item.encrypted) {
      // Check if already unlocked by trying to view
      setPendingViewAfterUnlock(item)
      setUnlockItem(item)
      return
    }
    const vtype = getViewerType(item)
    if (vtype) {
      setViewItem(item)
    } else {
      window.open(`/file-storage-app/files/download?uuid=${item.id}`, '_blank')
    }
  }

  const handleUnlockNeeded = (item: FileItem) => {
    setPendingViewAfterUnlock(item)
    setUnlockItem(item)
  }

  const handleUnlocked = () => {
    setUnlockItem(null)
    if (pendingViewAfterUnlock) {
      const item = pendingViewAfterUnlock
      setPendingViewAfterUnlock(null)
      const vtype = getViewerType(item)
      if (vtype) {
        setViewItem(item)
      } else {
        window.open(`/file-storage-app/files/stream?uuid=${item.id}`, '_blank')
      }
    }
  }

  const goUp = () => {
    if (path === '/') return
    const parts = pathParts(path)
    load(pathAtIndex(parts, parts.length - 2))
  }

  const currentPathParts = pathParts(path)
  const filtered = items.filter((i) =>
    !search || i.filename.toLowerCase().includes(search.toLowerCase())
  )

  const showParent = path !== '/' && !search

  // Selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (selected.size === filtered.filter(i => !i.directory).length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.filter(i => !i.directory).map(i => i.id)))
    }
  }

  // Sync
  const doSync = async () => {
    setSyncing(true)
    try {
      await client.post('/files/sync')
      showNotification('Synchronization complete', 'success')
      load(path)
    } catch {
      showNotification('Sync failed', 'error')
    } finally {
      setSyncing(false)
    }
  }

  // Create folder
  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await client.post('/files/folder', null, { params: { path, name: newFolderName.trim() } })
      showNotification('Folder created', 'success')
      setNewFolderDialog(false)
      setNewFolderName('')
      load(path)
    } catch {
      showNotification('Failed to create folder', 'error')
    }
  }

  // Delete
  const doDelete = async () => {
    if (!deleteTarget) return
    try {
      await client.delete(`/files/${deleteTarget.id}`)
      showNotification('Deleted', 'success')
      setDeleteTarget(null)
      load(path)
    } catch {
      showNotification('Delete failed', 'error')
    }
  }

  // Rename
  const startRename = (item: FileItem) => {
    setRenaming(item.id)
    setRenameValue(item.filename)
  }
  const commitRename = async (item: FileItem) => {
    if (!renameValue.trim() || renameValue === item.filename) { setRenaming(null); return }
    try {
      await client.patch(`/files/${item.id}/rename`, null, { params: { name: renameValue.trim() } })
      showNotification('Renamed', 'success')
      load(path)
    } catch {
      showNotification('Rename failed', 'error')
    } finally {
      setRenaming(null)
    }
  }

  // ZIP download
  const downloadZip = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    try {
      const response = await client.post('/files/download-zip', ids, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'files.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showNotification('ZIP download failed', 'error')
    }
  }

  const filesOnlyCount = filtered.filter(i => !i.directory).length
  const allSelected = filesOnlyCount > 0 && selected.size === filesOnlyCount

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.breadcrumb}>
          <button className={styles.breadcrumbPart} onClick={() => load('/')}>Files</button>
          {currentPathParts.map((part, i) => {
            const isLast = i === currentPathParts.length - 1
            return (
              <Fragment key={i}>
                <span className={styles.breadcrumbSep}>/</span>
                <button
                  className={isLast ? styles.breadcrumbCurrent : styles.breadcrumbPart}
                  onClick={() => !isLast && load(pathAtIndex(currentPathParts, i))}
                >
                  {part}
                </button>
              </Fragment>
            )
          })}
        </div>
        <div className={styles.toolbarActions}>
          {selected.size > 0 && (
            <Button variant="secondary" onClick={downloadZip}>
              ⬇ ZIP ({selected.size})
            </Button>
          )}
          {path !== '/' && <Button variant="ghost" onClick={goUp}>↑ Up</Button>}
          <Button variant="secondary" onClick={doSync} disabled={syncing}>
            {syncing ? '⟳ Syncing…' : '⟳ Sync'}
          </Button>
          <Button variant="secondary" onClick={() => setUploadDialog(true)}>⬆ Upload</Button>
          <Button variant="secondary" onClick={() => { setNewFolderName(''); setNewFolderDialog(true) }}>
            📁 New Folder
          </Button>
          <button className={styles.viewToggle} onClick={toggleViewMode} title={viewMode === 'list' ? 'Switch to grid' : 'Switch to list'}>
            {viewMode === 'list' ? '⊞' : '☰'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          placeholder="Search in current folder…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* File list / grid */}
      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : filtered.length === 0 && !showParent ? (
          <div className={styles.empty}>
            {search ? 'No files match your search.' : 'This folder is empty.'}
          </div>
        ) : viewMode === 'list' ? (
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.colCheck}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allSelected}
                    onChange={selectAll}
                  />
                </th>
                <th className={styles.colName}>Name</th>
                <th className={styles.colSize}>Size</th>
                <th className={styles.colDate}>Modified</th>
                <th className={styles.colActions} />
              </tr>
            </thead>
            <tbody>
              {showParent && (
                <tr className={styles.row} onClick={goUp} style={{ cursor: 'pointer' }}>
                  <td className={styles.cell} />
                  <td>
                    <div className={styles.cellName}>
                      <span className={styles.fileIcon}><FaFolderOpen size={16} color="var(--color-warning, #f59e0b)" /></span>
                      <span className={styles.fileName}>../</span>
                    </div>
                  </td>
                  <td className={styles.cell}>—</td>
                  <td className={styles.cell}>—</td>
                  <td className={styles.cell} />
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className={`${styles.row} ${selected.has(item.id) ? styles.rowSelected : ''}`}>
                  <td className={styles.cell}>
                    {!item.directory && (
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </td>
                  <td>
                    {renaming === item.id ? (
                      <input
                        autoFocus
                        className={styles.renameInput}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(item)
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                      />
                    ) : (
                      <div className={styles.cellName} onClick={() => navigate(item)}>
                        <span className={styles.fileIcon}><FileIcon item={item} size={16} /></span>
                        <span className={styles.fileName}>{item.filename}</span>
                        {item.encrypted && <span className={styles.encBadge}>ENC</span>}
                      </div>
                    )}
                  </td>
                  <td className={styles.cell} style={{ textAlign: 'right' }}>
                    {item.directory ? '—' : formatSize(item.fileSize)}
                  </td>
                  <td className={styles.cell}>{formatDate(item.modificationDate)}</td>
                  <td className={styles.cell}>
                    <div className={styles.rowActions}>
                      {!item.directory && (
                        <button
                          className={styles.actionBtn}
                          title="Download"
                          onClick={() => window.open(`/file-storage-app/files/download?uuid=${item.id}`, '_blank')}
                        >⬇</button>
                      )}
                      {!item.directory && getViewerType(item) && (
                        <button
                          className={styles.actionBtn}
                          title="Preview"
                          onClick={() => {
                            if (item.encrypted) { handleUnlockNeeded(item) } else { setViewItem(item) }
                          }}
                        >👁</button>
                      )}
                      <button
                        className={styles.actionBtn}
                        title="Rename"
                        onClick={() => startRename(item)}
                      >✏</button>
                      <button
                        className={styles.actionBtn}
                        title="Move"
                        onClick={() => setMoveTarget(item)}
                      >↷</button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        title="Delete"
                        onClick={() => setDeleteTarget(item)}
                      >🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Grid / tile view */
          <div className={styles.grid}>
            {showParent && (
              <div className={styles.tile} onClick={goUp}>
                <div className={styles.tileThumb}>
                  <FaFolderOpen size={32} color="var(--color-warning, #f59e0b)" />
                </div>
                <div className={styles.tileName}>../</div>
              </div>
            )}
            {filtered.map((item) => {
              const ext = (item.extension ?? '').toLowerCase()
              const isImage = IMAGE_EXT.has(ext)
              return (
                <div
                  key={item.id}
                  className={`${styles.tile} ${selected.has(item.id) ? styles.tileSelected : ''}`}
                  onClick={() => navigate(item)}
                >
                  {!item.directory && (
                    <div
                      className={styles.tileCheckWrap}
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selected.has(item.id)}
                        readOnly
                      />
                    </div>
                  )}
                  <div className={styles.tileThumb}>
                    {isImage && !item.encrypted ? (
                      <img
                        src={`/file-storage-app/files/thumbnail?uuid=${item.id}`}
                        alt={item.filename}
                        className={styles.tileImg}
                        loading="lazy"
                      />
                    ) : (
                      <FileIcon item={item} size={32} />
                    )}
                  </div>
                  <div className={styles.tileName} title={item.filename}>
                    {item.filename}
                  </div>
                  {item.encrypted && <span className={styles.encBadge} style={{ alignSelf: 'center', marginBottom: 4 }}>ENC</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Folder dialog */}
      {newFolderDialog && (
        <Dialog open title="New Folder" onClose={() => setNewFolderDialog(false)} width="min(90vw,360px)"
          footer={
            <>
              <Button variant="ghost" onClick={() => setNewFolderDialog(false)}>Cancel</Button>
              <Button variant="primary" onClick={createFolder}>Create</Button>
            </>
          }
        >
          <TextField
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            autoFocus
          />
        </Dialog>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <Dialog open title="Delete" onClose={() => setDeleteTarget(null)} width="min(90vw,360px)"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={doDelete}>Delete</Button>
            </>
          }
        >
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Delete <strong style={{ color: 'var(--color-text-primary)' }}>{deleteTarget.filename}</strong>?
            {deleteTarget.directory && ' This will delete all contents.'}
          </span>
        </Dialog>
      )}

      {/* Upload dialog */}
      {uploadDialog && (
        <UploadDialog
          currentPath={path}
          onClose={() => setUploadDialog(false)}
          onUploaded={() => load(path)}
        />
      )}

      {/* Move dialog */}
      {moveTarget && (
        <MoveDialog
          item={moveTarget}
          currentPath={path}
          onClose={() => setMoveTarget(null)}
          onMoved={() => load(path)}
        />
      )}

      {/* File viewer */}
      {viewItem && (
        <FileViewerDialog
          item={viewItem}
          onClose={() => setViewItem(null)}
          onUnlockNeeded={handleUnlockNeeded}
        />
      )}

      {/* Unlock dialog */}
      {unlockItem && (
        <UnlockDialog
          item={unlockItem}
          onClose={() => { setUnlockItem(null); setPendingViewAfterUnlock(null) }}
          onUnlocked={handleUnlocked}
        />
      )}
    </div>
  )
}
