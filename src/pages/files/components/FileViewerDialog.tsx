import client from '../../../api/client'
import {Button} from '../../../components/ui/Button'
import {DynamicFormDialog} from '../../../components/ui/DynamicFormDialog'
import {useNotification} from '../../../components/ui/Notification'
import styles from '../FilesPage.module.css'
import {useEffect, useState} from 'react'
import {type FileItem, getViewerType} from '../fileTypes'
import {createStreamUrl} from '../fileStream'
import {useSecureFileUrl} from '../hooks/useSecureFileUrl'

const MAX_EDITABLE_BYTES = 2 * 1024 * 1024

export function FileViewerDialog({item, onClose, onUnlockNeeded}: {
    item: FileItem
    onClose: () => void
    onUnlockNeeded: (item: FileItem) => void
}) {
    const {showNotification} = useNotification()
    const vtype = getViewerType(item)
    const isEditable = vtype === 'text' && (item.fileSize == null || item.fileSize <= MAX_EDITABLE_BYTES) && !item.encrypted
    const [textContent, setTextContent] = useState<string | null>(null)
    const [editMode, setEditMode] = useState(false)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [textError, setTextError] = useState(false)
    const thumbnailUrl = `/thumbnail?uuid=${item.id}`

    useEffect(() => {
        if (vtype === 'text') {
            if (item.encrypted) {
                fetch(thumbnailUrl)
                    .then((r) => {
                        if (r.status === 401) {
                            onUnlockNeeded(item);
                            onClose();
                            return null
                        }
                        return r.text()
                    })
                    .then((t) => t !== null && setTextContent(t))
                    .catch(() => setTextError(true))
            } else {
                createStreamUrl(item.id)
                    .then((url) => fetch(url))
                    .then(async (r) => {
                        if (!r.ok) throw new Error('Could not load file')
                        const content = new TextDecoder('utf-8', {fatal: true}).decode(await r.arrayBuffer())
                        if (content.includes('\0')) throw new Error('File contains binary data')
                        return content
                    })
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
                headers: {'Content-Type': 'text/plain'},
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

    const {url: secureUrl} = useSecureFileUrl(
        vtype === 'image' ? item.id : undefined,
        1000,
        false,
        item.filename
    )

    const [streamUrl, setStreamUrl] = useState<string>()
    useEffect(() => {
        if (vtype === 'video' || vtype === 'pdf') {
            createStreamUrl(item.id)
                .then(setStreamUrl)
                .catch(() => setTextError(true))
        }
    }, [item.id, vtype])

    return (
        <DynamicFormDialog open title={item.filename} onClose={onClose} width="min(95vw, 900px)"
                footer={
                    <>
                        <div>
                            {textError && <p>Error occurred</p>}
                        </div>
                        {vtype === 'text' && isEditable && textContent !== null && !editMode && (
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
                }>
            <div className={styles.viewerBody}>
                {vtype === 'image' && (
                    <img
                        src={secureUrl}
                        alt={item.filename}
                        className={styles.viewerImage}
                    />
                )}

                {vtype === 'video' && streamUrl && (
                    <video
                        controls
                        className={styles.viewerVideo}
                        src={streamUrl}
                    />
                )}

                {vtype === 'pdf' && streamUrl && (
                    <iframe
                        src={streamUrl}
                        className={styles.viewerPdf}
                        title={item.filename}
                    />
                )}

                {vtype === 'text' && (
                    editMode ? (
                        <textarea
                            className={styles.viewerTextEdit}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                        />
                    ) : (
                        <pre className={styles.viewerText}>
            {textContent ?? 'Loading...'}
        </pre>
                    )
                )}
            </div>
        </DynamicFormDialog>
    )
}
