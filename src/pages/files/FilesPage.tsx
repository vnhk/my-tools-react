import {Fragment, useCallback, useEffect, useState} from 'react'
import {
    FaCalculator,
    FaDownload,
    FaEdit,
    FaEye,
    FaFile,
    FaFileAlt,
    FaFileArchive,
    FaFileAudio,
    FaFileImage,
    FaFilePdf,
    FaFileVideo,
    FaFolder,
    FaFolderOpen,
    FaLongArrowAltRight,
    FaSync,
    FaTrash,
} from 'react-icons/fa'
import client from '../../api/client'
import {captureVideoThumbnail} from '../../utils/mediaUtils'
import {Button} from '../../components/ui/Button'
import {DynamicFormDialog} from '../../components/ui/DynamicFormDialog'
import {TextField} from '../../components/fields/TextField'
import {useNotification} from '../../components/ui/Notification'
import styles from './FilesPage.module.css'
import {AxiosError} from "axios";
import {useSearchParams} from 'react-router-dom'
import {TrashView} from './TrashView'
import {type FileItem, IMAGE_EXT, VIDEO_EXT, PDF_EXT, isTextFile, getViewerType} from './fileTypes'
import {dirPath, pathParts, pathAtIndex} from './filePaths'
import {createStreamUrl} from './fileStream'
import {useSecureFileUrl} from './hooks/useSecureFileUrl'
import {UploadDialog} from './components/UploadDialog'
import {MoveDialog} from './components/MoveDialog'
import {UntrackedFilesNotice} from './components/UntrackedFilesNotice'
import {FileViewerDialog} from './components/FileViewerDialog'

export {createStreamUrl, useSecureFileUrl}

function FileIcon({item, size = 16}: { item: FileItem; size?: number }) {
    const ext = (item.extension ?? '').toLowerCase()
    const style = {flexShrink: 0 as const}
    if (item.directory) return <FaFolder size={size} color="var(--color-warning, #f59e0b)" style={style}/>
    if (IMAGE_EXT.has(ext)) return <FaFileImage size={size} color="var(--color-primary, #a5b4fc)" style={style}/>
    if (VIDEO_EXT.has(ext)) return <FaFileVideo size={size} color="var(--color-danger, #ef4444)" style={style}/>
    if (PDF_EXT.has(ext)) return <FaFilePdf size={size} color="#f87171" style={style}/>
    if (isTextFile(item)) return <FaFileAlt size={size} color="var(--color-text-secondary)" style={style}/>
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FaFileArchive size={size} color="#fbbf24"
                                                                               style={style}/>
    if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) return <FaFileAudio size={size} color="#34d399" style={style}/>
    return <FaFile size={size} color="var(--color-text-tertiary)" style={style}/>
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
    return new Date(s).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})
}

// paths: root = "/", subdir = "/Folder/", nested = "/Folder/Sub/"
// always absolute (leading /) and trailing /
// ---- Encryption Unlock Dialog ----
function UnlockDialog({item, onClose, onUnlocked}: {
    item: FileItem
    onClose: () => void
    onUnlocked: () => void
}) {
    const {showNotification} = useNotification()
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)

    const doUnlock = async () => {
        if (!password.trim()) return
        setBusy(true)
        try {
            await client.post(`/files/${item.id}/unlock`, null, {params: {password}})
            showNotification('File unlocked', 'success')
            onUnlocked()
        } catch (e) {
            const error = e as AxiosError;
            if (error?.response?.status === 403) {
                showNotification('Wrong password', 'error')
            } else {
                showNotification('Unlock failed', 'error')
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <DynamicFormDialog open title={`Unlock "${item.filename}"`} onClose={onClose} width="min(90vw,380px)"
                footer={
                    <>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={doUnlock} disabled={busy || !password.trim()}>Unlock</Button>
                    </>
                }
        >
            <p style={{color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 16}}>
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
        </DynamicFormDialog>
    )
}

// ---- Main Page ----
export function FilesPage() {
    const {showNotification} = useNotification()
    const [path, setPath] = useState('/')
    const [items, setItems] = useState<FileItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [renaming, setRenaming] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [moveTarget, setMoveTarget] = useState<FileItem[] | null>(null)
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
    const [calculatingFolderId, setCalculatingFolderId] = useState<string | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()
    const isTrashView = searchParams.get('view') === 'trash'
    const highlightId = searchParams.get('highlight')
    const [trashCount, setTrashCount] = useState<number>(0)

    const loadTrashCount = useCallback(() => {
        client.get<any[]>('/files/trash')
            .then((r) => setTrashCount(r.data.length))
            .catch(() => {})
    }, [])

    useEffect(() => {
        loadTrashCount()
    }, [loadTrashCount])

    const load = useCallback((p: string) => {
        setLoading(true)
        setSearch('')
        setSelected(new Set())
        client.get<FileItem[]>('/files', {params: {path: p}})
            .then((r) => {
                setItems(r.data);
                setPath(p)
            })
            .catch(() => showNotification('Failed to load files', 'error'))
            .finally(() => setLoading(false))
    }, [showNotification])

    useEffect(() => {
        load('/')
    }, [load])

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
            createStreamUrl(item.id)
                .then(url => window.open(url, '_blank'))
                .catch(() => showNotification('Download failed', 'error'))
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
                window.open(`/thumbnail?uuid=${item.id}`, '_blank')
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
        if (selected.size === filtered.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map(i => i.id)))
        }
    }

    // Sync
    const doSync = async () => {
        setSyncing(true)
        try {
            await client.post('/files/sync', null, {params: {path}})
            showNotification('Directory synchronization complete', 'success')
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
            await client.post('/files/folder', null, {params: {path, name: newFolderName.trim()}})
            showNotification('Folder created', 'success')
            setNewFolderDialog(false)
            setNewFolderName('')
            load(path)
        } catch {
            showNotification('Failed to create folder', 'error')
        }
    }

    // Delete (moves to trash)
    const doDelete = async () => {
        if (!deleteTarget) return
        try {
            await client.delete(`/files/${deleteTarget.id}`)
            showNotification('Moved to trash', 'success')
            setDeleteTarget(null)
            load(path)
            loadTrashCount()
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
        if (!renameValue.trim() || renameValue === item.filename) {
            setRenaming(null);
            return
        }
        try {
            await client.patch(`/files/${item.id}/rename`, null, {params: {name: renameValue.trim()}})
            showNotification('Renamed', 'success')
            load(path)
        } catch {
            showNotification('Rename failed', 'error')
        } finally {
            setRenaming(null)
        }
    }

    // Calculate folder size recursively
    const handleCalculateFolderSize = async (item: FileItem) => {
        if (!item.directory || calculatingFolderId) return
        setCalculatingFolderId(item.id)
        try {
            const res = await client.post<number>(`/files/${item.id}/calculate-size`)
            const totalSize = res.data
            setItems((prev) =>
                prev.map((it) => (it.id === item.id ? {...it, fileSize: totalSize} : it))
            )
            showNotification(`Calculated size for "${item.filename}": ${formatSize(totalSize)}`, 'success')
        } catch (e) {
            console.error('Failed to calculate folder size:', e)
            showNotification(`Failed to calculate size for "${item.filename}"`, 'error')
        } finally {
            setCalculatingFolderId(null)
        }
    }

    // ZIP download
    const downloadZip = async () => {
        const ids = Array.from(selected)
        if (ids.length === 0) return
        try {
            const response = await client.post('/files/download-zip', ids, {responseType: 'blob'})
            const url = URL.createObjectURL(new Blob([response.data], {type: 'application/zip'}))
            const a = document.createElement('a')
            a.href = url
            a.download = 'files.zip'
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            showNotification('ZIP download failed', 'error')
        }
    }

    const downloadOne = async (item: FileItem) => {
        try {
            const url = await createStreamUrl(item.id)

            const a = document.createElement('a')
            a.href = url
            a.download = item.filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

        } catch {
            showNotification('File download failed', 'error')
        }
    }

    const allSelected = filtered.length > 0 && selected.size === filtered.length

    function handleMoveOne(item: FileItem) {
        setMoveTarget([item])
    }

    function handleMoveMultiple() {
        setMoveTarget(Array.from(selected).map(id => items.find(i => i.id === id)!))
    }


    function SecureImageForGridThumbnail({item}: { item: FileItem }) {
        const {url} = useSecureFileUrl(item.id, 65, true, item.filename);
        return <img src={url} alt={item.filename} className={styles.tileImg} loading="lazy"/>;
    }

    function SecureVideoForGridThumbnail({item}: { item: FileItem }) {
        const [thumbUrl, setThumbUrl] = useState<string>()
        useEffect(() => {
            let active = true
            createStreamUrl(item.id)
                .then(url => captureVideoThumbnail(url))
                .then(dataUrl => {
                    if (active) setThumbUrl(dataUrl)
                })
                .catch(() => {})
            return () => { active = false }
        }, [item.id])

        if (!thumbUrl) {
            return <FileIcon item={item} size={32}/>
        }
        return <img src={thumbUrl} alt={item.filename} className={styles.tileImg} loading="lazy"/>;
    }

    if (isTrashView) {
        return (
            <div className={styles.page}>
                <TrashView
                    highlightId={highlightId}
                    onBackToFiles={() => {
                        setSearchParams({})
                        load(path)
                        loadTrashCount()
                    }}
                />
            </div>
        )
    }

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
                    {selected.size > 0 && (
                        <Button variant="secondary" onClick={handleMoveMultiple}>
                            <FaLongArrowAltRight/>
                            Move ({selected.size})
                        </Button>
                    )}
                    {path !== '/' && <Button variant="ghost" onClick={goUp}>↑ Up</Button>}
                    <Button variant="secondary" onClick={doSync} disabled={syncing}>
                        {syncing ? '⟳ Syncing…' : '⟳ Synchronize current directory'}
                    </Button>
                    <Button variant="secondary" onClick={() => setUploadDialog(true)}>⬆ Upload</Button>
                    <Button variant="secondary" onClick={() => {
                        setNewFolderName('');
                        setNewFolderDialog(true)
                    }}>
                        📁 New Folder
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setSearchParams({view: 'trash'})}
                        title="Open Trash"
                    >
                        <FaTrash color="var(--color-danger, #ef4444)"/>
                        Trash {trashCount > 0 && `(${trashCount})`}
                    </Button>
                    <button className={styles.viewToggle} onClick={toggleViewMode}
                            title={viewMode === 'list' ? 'Switch to grid' : 'Switch to list'}>
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

            <UntrackedFilesNotice key={path} path={path}/>

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
                            <th className={styles.colActions}/>
                        </tr>
                        </thead>
                        <tbody>
                        {showParent && (
                            <tr className={styles.row} onClick={goUp} style={{cursor: 'pointer'}}>
                                <td className={styles.cell}/>
                                <td>
                                    <div className={styles.cellName}>
                                        <span className={styles.fileIcon}><FaFolderOpen size={16}
                                                                                        color="var(--color-warning, #f59e0b)"/></span>
                                        <span className={styles.fileName}>../</span>
                                    </div>
                                </td>
                                <td className={styles.cell}>—</td>
                                <td className={styles.cell}>—</td>
                                <td className={styles.cell}/>
                            </tr>
                        )}
                        {filtered.map((item) => (
                            <tr key={item.id}
                                className={`${styles.row} ${selected.has(item.id) ? styles.rowSelected : ''}`}>
                                <td className={styles.cell}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={selected.has(item.id)}
                                        onChange={() => toggleSelect(item.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
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
                                                <span className={styles.fileIcon}><FileIcon item={item}
                                                                                            size={16}/></span>
                                            <span className={styles.fileName}>{item.filename}</span>
                                            {item.encrypted && <span className={styles.encBadge}>ENC</span>}
                                        </div>
                                    )}
                                </td>
                                <td className={styles.cell} style={{textAlign: 'right'}}>
                                    {item.directory ? (
                                        <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end'}}>
                                            <span>{item.fileSize != null ? formatSize(item.fileSize) : '—'}</span>
                                            <button
                                                className={styles.actionBtn}
                                                title="Calculate folder size"
                                                disabled={calculatingFolderId === item.id}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleCalculateFolderSize(item)
                                                }}
                                            >
                                                {calculatingFolderId === item.id ? (
                                                    <FaSync className={styles.spinning} size={11} />
                                                ) : (
                                                    <FaCalculator size={11} />
                                                )}
                                            </button>
                                        </span>
                                    ) : (
                                        formatSize(item.fileSize)
                                    )}
                                </td>
                                <td className={styles.cell}>{formatDate(item.modificationDate)}</td>
                                <td className={styles.cell}>
                                    <div className={styles.rowActions}>
                                        {!item.directory && (
                                            <button
                                                className={styles.actionBtn}
                                                title="Download"
                                                onClick={() => downloadOne(item)}
                                            ><FaDownload/></button>
                                        )}
                                        {!item.directory && getViewerType(item) && (
                                            <button
                                                className={styles.actionBtn}
                                                title="Preview"
                                                onClick={() => {
                                                    if (item.encrypted) {
                                                        handleUnlockNeeded(item)
                                                    } else {
                                                        setViewItem(item)
                                                    }
                                                }}
                                            ><FaEye/></button>
                                        )}
                                        <button
                                            className={styles.actionBtn}
                                            title="Rename"
                                            onClick={() => startRename(item)}
                                        ><FaEdit/>
                                        </button>
                                        <button
                                            className={styles.actionBtn}
                                            title="Move"
                                            onClick={() => handleMoveOne(item)}
                                        ><FaLongArrowAltRight/>
                                        </button>
                                        <button
                                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                            title="Delete"
                                            onClick={() => setDeleteTarget(item)}
                                        ><FaTrash/>
                                        </button>
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
                                    <FaFolderOpen size={32} color="var(--color-warning, #f59e0b)"/>
                                </div>
                                <div className={styles.tileName}>../</div>
                            </div>
                        )}
                        {filtered.map((item) => {
                            const ext = (item.extension ?? '').toLowerCase()
                            const isImage = IMAGE_EXT.has(ext)
                            const isVideo = VIDEO_EXT.has(ext)
                            return (
                                <div
                                    key={item.id}
                                    className={`${styles.tile} ${selected.has(item.id) ? styles.tileSelected : ''}`}
                                    onClick={() => navigate(item)}
                                >
                                    <div
                                        className={styles.tileCheckWrap}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelect(item.id)
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={selected.has(item.id)}
                                            readOnly
                                        />
                                    </div>
                                    <div className={styles.tileThumb}>
                                        {isImage && !item.encrypted ? (
                                            <SecureImageForGridThumbnail key={item.id} item={item}/>
                                        ) : isVideo && !item.encrypted ? (
                                            <SecureVideoForGridThumbnail key={item.id} item={item}/>
                                        ) : (
                                            <FileIcon item={item} size={32}/>
                                        )}
                                    </div>
                                    <div className={styles.tileName} title={item.filename}>
                                        {item.filename}
                                    </div>
                                    {item.directory && (
                                        <div
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontSize: 11,
                                                color: 'var(--color-text-secondary)',
                                                marginTop: 2,
                                                padding: '0 4px',
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span>{item.fileSize != null ? formatSize(item.fileSize) : '—'}</span>
                                            <button
                                                className={styles.actionBtn}
                                                title="Calculate folder size"
                                                disabled={calculatingFolderId === item.id}
                                                onClick={() => handleCalculateFolderSize(item)}
                                                style={{padding: 2, border: 'none', background: 'none'}}
                                            >
                                                {calculatingFolderId === item.id ? (
                                                    <FaSync className={styles.spinning} size={10} />
                                                ) : (
                                                    <FaCalculator size={10} />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    {item.encrypted && <span className={styles.encBadge}
                                                             style={{
                                                                 alignSelf: 'center',
                                                                 marginBottom: 4
                                                             }}>ENC</span>}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* New Folder dialog */}
            {newFolderDialog && (
                <DynamicFormDialog open title="New Folder" onClose={() => setNewFolderDialog(false)} width="min(90vw,360px)"
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
                </DynamicFormDialog>
            )}

            {/* Delete confirm dialog */}
            {deleteTarget && (
                <DynamicFormDialog open title="Delete" onClose={() => setDeleteTarget(null)} width="min(90vw,360px)"
                        footer={
                            <>
                                <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                                <Button variant="danger" onClick={doDelete}>Delete</Button>
                            </>
                        }
                >
          <span style={{color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)'}}>
            Delete <strong style={{color: 'var(--color-text-primary)'}}>{deleteTarget.filename}</strong>?
              {deleteTarget.directory && ' This will delete all contents.'}
          </span>
                </DynamicFormDialog>
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
                    items={moveTarget}
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
                    onClose={() => {
                        setUnlockItem(null);
                        setPendingViewAfterUnlock(null)
                    }}
                    onUnlocked={handleUnlocked}
                />
            )}
        </div>
    )
}
