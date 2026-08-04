import { useEffect, useState } from 'react'
import client from '../../api/client'
import { getViewerType, type RemoteFileItem } from './fileViewerType'
import styles from './RemoteControlPage.module.css'

interface Props {
    connected: boolean
    send: (action: string, data?: Record<string, unknown>) => void
}

function dirPath(parentPath: string, folderName: string): string {
    return parentPath + folderName + '/'
}

function parentPath(path: string): string {
    if (path === '/') return '/'
    const trimmed = path.replace(/\/$/, '')
    const idx = trimmed.lastIndexOf('/')
    return idx <= 0 ? '/' : trimmed.slice(0, idx + 1)
}

// Read-only file browser: lists folders/files the same way FilesPage.tsx does,
// but the only action available here is "show this on the TV" — no upload,
// delete, rename, move or download.
export function FilesRemoteTab({ connected, send }: Props) {
    const [path, setPath] = useState('/')
    const [items, setItems] = useState<RemoteFileItem[]>([])
    const [loading, setLoading] = useState(false)
    const [shownFileId, setShownFileId] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
        setLoading(true)
        client.get<RemoteFileItem[]>('/files', { params: { path } })
            .then((res) => { if (mounted) setItems(res.data) })
            .catch(() => { if (mounted) setItems([]) })
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [path])

    const showFile = (item: RemoteFileItem) => {
        if (!connected || item.encrypted) return
        const viewerType = getViewerType(item)
        if (!viewerType) return
        setShownFileId(item.id)
        send('FILES_SHOW', { fileId: item.id, viewerType, filename: item.filename })
    }

    const stopShowing = () => {
        setShownFileId(null)
        send('FILES_STOP')
    }

    const folders = items.filter((i) => i.directory)
    const files = items.filter((i) => !i.directory)

    return (
        <div className={styles.controls}>
            <div className={styles.section}>
                <div className={styles.row}>
                    <button
                        className={styles.remoteBtn}
                        disabled={!connected}
                        onClick={() => send('NAVIGATE', { url: '/files/tv-view' })}
                    >
                        📺 Show TV screen
                    </button>
                    <button
                        className={styles.remoteBtn}
                        disabled={!connected || !shownFileId}
                        onClick={stopShowing}
                    >
                        ⏹ Clear
                    </button>
                </div>
            </div>

            <div className={styles.searchSection}>
                <div className={styles.searchHeader}>
                    <label className={styles.searchLabel}>{path}</label>
                    {path !== '/' && (
                        <button className={styles.filterToggle} onClick={() => setPath(parentPath(path))}>
                            ⬆ Up
                        </button>
                    )}
                </div>

                {loading && <div className={styles.noResults}>Loading…</div>}
                {!loading && items.length === 0 && <div className={styles.noResults}>Empty folder</div>}

                <div className={styles.results}>
                    {folders.map((f) => (
                        <button
                            key={f.id}
                            className={styles.resultItem}
                            onClick={() => setPath(dirPath(path, f.filename))}
                        >
                            <div className={styles.resultRow}>
                                <div className={styles.resultInfo}>
                                    <div className={styles.resultTitle}>📁 {f.filename}</div>
                                </div>
                            </div>
                        </button>
                    ))}

                    {files.map((f) => {
                        const viewerType = getViewerType(f)
                        const showable = !!viewerType && !f.encrypted
                        return (
                            <div key={f.id} className={styles.resultItem}>
                                <div className={styles.resultRow}>
                                    <div className={styles.resultInfo}>
                                        <div className={styles.resultTitle}>
                                            {f.encrypted ? '🔒' : viewerType === 'image' ? '🖼' : viewerType === 'video' ? '🎞' : '📄'} {f.filename}
                                        </div>
                                        <div className={styles.resultMeta}>
                                            {f.encrypted ? 'encrypted — unavailable from remote' : !showable ? 'unsupported type' : viewerType}
                                        </div>
                                    </div>
                                    <div className={styles.resultActions}>
                                        <button
                                            className={`${styles.resultBtn} ${styles.playBtn}`}
                                            disabled={!connected || !showable}
                                            onClick={() => showFile(f)}
                                            title="Show on TV"
                                        >
                                            📺 Show
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
