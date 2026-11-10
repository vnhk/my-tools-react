import client from '../../../api/client'
import {Button} from '../../../components/ui/Button'
import {DynamicFormDialog} from '../../../components/ui/DynamicFormDialog'
import {useNotification} from '../../../components/ui/Notification'
import styles from '../FilesPage.module.css'
import {Fragment, useCallback, useEffect, useState} from 'react'
import {FaFolder} from 'react-icons/fa'
import {type FileItem} from '../fileTypes'
import {dirPath, pathAtIndex, pathParts} from '../filePaths'

export function MoveDialog({
                        items, currentPath, onClose, onMoved,
                    }: { items: FileItem[]; currentPath: string; onClose: () => void; onMoved: () => void }) {
    const {showNotification} = useNotification()
    const [browsePath, setBrowsePath] = useState('/')
    const [dirs, setDirs] = useState<FileItem[]>([])
    const [busy, setBusy] = useState(false)

    const loadDirs = useCallback((p: string) => {
        client.get<FileItem[]>('/files/directories', {params: {path: p}})
            .then((r) => {
                setDirs(r.data);
                setBrowsePath(p)
            })
            .catch(() => {
            })
    }, [])

    useEffect(() => {
        loadDirs('/')
    }, [loadDirs])

    const doMove = async () => {
        if (browsePath === currentPath) {
            showNotification('Already in this folder', 'error');
            return
        }
        setBusy(true)
        try {
            await client.post(`/files/move`, {ids: items.map((i) => i.id)}, {params: {destPath: browsePath}})
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
        <DynamicFormDialog open title={`Move "${items.length} files"`} onClose={onClose} width="min(90vw,420px)"
                footer={
                    <>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={doMove} disabled={busy}>Move here</Button>
                    </>
                }
        >
            <div style={{marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center'}}>
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
                {dirs.length === 0 && <div className={styles.empty} style={{padding: '16px 0'}}>No subfolders</div>}
                {dirs.map((d) => (
                    <button
                        key={d.id}
                        className={styles.folderItem}
                        onClick={() => loadDirs(dirPath(browsePath, d.filename))}
                    >
                        <FaFolder size={14} color="var(--color-warning, #f59e0b)"
                                  style={{marginRight: 6, flexShrink: 0}}/> {d.filename}
                    </button>
                ))}
            </div>
        </DynamicFormDialog>
    )
}
