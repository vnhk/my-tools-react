import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    FaArrowLeft,
    FaCheckSquare,
    FaFile,
    FaFileAlt,
    FaFileArchive,
    FaFileAudio,
    FaFileImage,
    FaFilePdf,
    FaFileVideo,
    FaFolder,
    FaRedo,
    FaSquare,
    FaTrash,
    FaTrashAlt,
} from 'react-icons/fa'
import client from '../../api/client'
import { Button } from '../../components/ui/Button'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { useNotification } from '../../components/ui/Notification'
import styles from './FilesPage.module.css'

export interface TrashItem {
    id: string
    filename: string
    path: string
    directory: boolean
    extension: string | null
    fileSize: number | null
    encrypted: boolean
    modificationDate: string | null
    inTrash: boolean
    inTrashStartDate: string | null
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'mkv'])
const TEXT_EXT = new Set(['txt', 'md', 'json', 'xml', 'csv', 'log', 'yaml', 'yml', 'vtt', 'srt'])
const PDF_EXT = new Set(['pdf'])

function FileIcon({ item, size = 16 }: { item: TrashItem; size?: number }) {
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
    return new Date(s).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function getDaysRemaining(inTrashStartDate: string | null): string {
    if (!inTrashStartDate) return '—'
    const deletedDate = new Date(inTrashStartDate)
    const now = new Date()
    const diffMs = now.getTime() - deletedDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const remaining = 30 - diffDays
    if (remaining <= 0) return 'Purging soon'
    if (remaining === 1) return '1 day left'
    return `${remaining} days left`
}

interface TrashViewProps {
    highlightId?: string | null
    onBackToFiles: () => void
}

export function TrashView({ highlightId, onBackToFiles }: TrashViewProps) {
    const { showNotification } = useNotification()
    const [items, setItems] = useState<TrashItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [confirmPermanent, setConfirmPermanent] = useState<TrashItem[] | null>(null)
    const [confirmEmpty, setConfirmEmpty] = useState(false)
    const [busy, setBusy] = useState(false)

    const loadTrash = useCallback(async () => {
        setLoading(true)
        setSelected(new Set())
        try {
            const res = await client.get<TrashItem[]>('/files/trash')
            setItems(res.data)
        } catch {
            showNotification('Failed to load trash items', 'error')
        } finally {
            setLoading(false)
        }
    }, [showNotification])

    useEffect(() => {
        loadTrash()
    }, [loadTrash])

    useEffect(() => {
        if (highlightId && items.some((it) => it.id === highlightId)) {
            setSelected(new Set([highlightId]))
        }
    }, [highlightId, items])

    const filtered = useMemo(() => {
        if (!search.trim()) return items
        const q = search.toLowerCase()
        return items.filter(
            (it) => it.filename.toLowerCase().includes(q) || it.path.toLowerCase().includes(q)
        )
    }, [items, search])

    const allSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id))

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map((it) => it.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const next = new Set(selected)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelected(next)
    }

    // Restore actions
    const doRestore = async (ids: string[]) => {
        setBusy(true)
        try {
            await client.post('/files/trash/restore', ids)
            showNotification(
                ids.length === 1 ? 'Item restored successfully' : `${ids.length} items restored successfully`,
                'success'
            )
            loadTrash()
        } catch (e: any) {
            if (e?.response?.status === 409) {
                showNotification('Cannot restore: an active file with the same name already exists', 'error')
            } else {
                showNotification('Failed to restore item(s)', 'error')
            }
        } finally {
            setBusy(false)
        }
    }

    // Permanent delete actions
    const doPermanentDelete = async (itemsToDelete: TrashItem[]) => {
        setBusy(true)
        try {
            const ids = itemsToDelete.map((it) => it.id)
            await client.post('/files/trash/permanent', ids)
            showNotification(
                ids.length === 1 ? 'Item permanently deleted' : `${ids.length} items permanently deleted`,
                'success'
            )
            setConfirmPermanent(null)
            loadTrash()
        } catch {
            showNotification('Failed to permanently delete item(s)', 'error')
        } finally {
            setBusy(false)
        }
    }

    // Empty trash
    const doEmptyTrash = async () => {
        setBusy(true)
        try {
            await client.delete('/files/trash/empty')
            showNotification('Trash emptied successfully', 'success')
            setConfirmEmpty(false)
            loadTrash()
        } catch {
            showNotification('Failed to empty trash', 'error')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Button variant="ghost" onClick={onBackToFiles}>
                        <FaArrowLeft /> Back to Files
                    </Button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
                        <FaTrash color="var(--color-danger, #ef4444)" />
                        <span>Trash</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 12 }}>
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                </div>

                <div className={styles.toolbarRight}>
                    {selected.size > 0 && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => doRestore(Array.from(selected))}
                                disabled={busy}
                            >
                                <FaRedo /> Restore Selected ({selected.size})
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    const selectedItems = items.filter((it) => selected.has(it.id))
                                    setConfirmPermanent(selectedItems)
                                }}
                                disabled={busy}
                            >
                                <FaTrashAlt /> Delete Permanently ({selected.size})
                            </Button>
                        </>
                    )}
                    {items.length > 0 && (
                        <Button
                            variant="danger"
                            onClick={() => setConfirmEmpty(true)}
                            disabled={busy}
                        >
                            <FaTrash /> Empty Trash
                        </Button>
                    )}
                </div>
            </div>

            {/* Auto-delete banner */}
            <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-warning, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}>
                <span>ℹ️</span>
                <span>Items in the trash will be automatically permanently deleted after <strong>30 days</strong>.</span>
            </div>

            {/* Search */}
            <div className={styles.searchBar}>
                <input
                    className={styles.searchInput}
                    placeholder="Search in trash by name or original path…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Trash table */}
            <div className={styles.tableWrap}>
                {loading ? (
                    <div className={styles.empty}>Loading trash items…</div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>
                        {search ? 'No items match your search in trash.' : 'Trash is empty.'}
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: 40 }} className={styles.th}>
                                    <button
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}
                                        onClick={toggleSelectAll}
                                        title={allSelected ? 'Deselect all' : 'Select all'}
                                    >
                                        {allSelected ? <FaCheckSquare color="var(--color-primary)" /> : <FaSquare />}
                                    </button>
                                </th>
                                <th className={styles.th}>Name</th>
                                <th className={styles.th}>Original Path</th>
                                <th className={styles.th}>Deleted Date</th>
                                <th className={styles.th}>Auto-delete in</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Size</th>
                                <th className={styles.th} style={{ textAlign: 'center', width: 140 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item) => {
                                const isSelected = selected.has(item.id)
                                const isHighlighted = highlightId === item.id
                                return (
                                    <tr
                                        key={item.id}
                                        className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                                        style={isHighlighted ? { outline: '2px solid var(--color-primary)', background: 'rgba(165,180,252,0.1)' } : undefined}
                                    >
                                        <td className={styles.cell}>
                                            <input
                                                type="checkbox"
                                                className={styles.checkbox}
                                                checked={isSelected}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        <td className={styles.cell}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <FileIcon item={item} size={16} />
                                                <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                                    {item.filename}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={styles.cell} style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                            {item.path}
                                        </td>
                                        <td className={styles.cell} style={{ fontSize: 'var(--font-size-xs)' }}>
                                            {formatDate(item.inTrashStartDate)}
                                        </td>
                                        <td className={styles.cell} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning, #f59e0b)' }}>
                                            {getDaysRemaining(item.inTrashStartDate)}
                                        </td>
                                        <td className={styles.cell} style={{ textAlign: 'right', fontSize: 'var(--font-size-xs)' }}>
                                            {formatSize(item.fileSize)}
                                        </td>
                                        <td className={styles.cell}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                                <button
                                                    className={styles.actionBtn}
                                                    title="Restore file"
                                                    disabled={busy}
                                                    onClick={() => doRestore([item.id])}
                                                >
                                                    <FaRedo size={12} color="var(--color-primary)" />
                                                </button>
                                                <button
                                                    className={styles.actionBtn}
                                                    title="Delete permanently"
                                                    disabled={busy}
                                                    onClick={() => setConfirmPermanent([item])}
                                                >
                                                    <FaTrashAlt size={12} color="var(--color-danger, #ef4444)" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Permanent delete confirmation dialog */}
            {confirmPermanent && (
                <DynamicFormDialog
                    open
                    title="Permanently Delete Items?"
                    onClose={() => setConfirmPermanent(null)}
                    width="min(90vw, 440px)"
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setConfirmPermanent(null)} disabled={busy}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={() => doPermanentDelete(confirmPermanent)} disabled={busy}>
                                Delete Permanently
                            </Button>
                        </>
                    }
                >
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                        Are you sure you want to permanently delete {confirmPermanent.length === 1 ? `"${confirmPermanent[0].filename}"` : `${confirmPermanent.length} items`}?
                        This action cannot be undone and will delete the file(s) from disk!
                    </p>
                </DynamicFormDialog>
            )}

            {/* Empty trash confirmation dialog */}
            {confirmEmpty && (
                <DynamicFormDialog
                    open
                    title="Empty Entire Trash?"
                    onClose={() => setConfirmEmpty(false)}
                    width="min(90vw, 440px)"
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setConfirmEmpty(false)} disabled={busy}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={doEmptyTrash} disabled={busy}>
                                Empty Trash
                            </Button>
                        </>
                    }
                >
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                        Are you sure you want to empty the trash? All {items.length} items will be permanently deleted from disk and database. This action cannot be undone!
                    </p>
                </DynamicFormDialog>
            )}
        </div>
    )
}
