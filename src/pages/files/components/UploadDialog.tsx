import client from '../../../api/client'
import {Button} from '../../../components/ui/Button'
import {DynamicFormDialog} from '../../../components/ui/DynamicFormDialog'
import {useNotification} from '../../../components/ui/Notification'
import styles from '../FilesPage.module.css'
import {useRef, useState} from 'react'
import {TextArea} from '../../../components/fields/TextArea'
import {Checkbox} from '../../../components/fields/Checkbox'
import {TrashConflictModal, type TrashConflictData} from '../TrashConflictModal'

export function UploadDialog({currentPath, onClose, onUploaded}: {
    currentPath: string
    onClose: () => void
    onUploaded: () => void
}) {
    const {showNotification} = useNotification()
    const [tab, setTab] = useState<'file' | 'folder'>('file')
    const [file, setFile] = useState<File | null>(null)
    const [folderFiles, setFolderFiles] = useState<FileList | null>(null)
    const [description, setDescription] = useState('')
    const [extract, setExtract] = useState(false)
    const [dragging, setDragging] = useState(false)
    const [busy, setBusy] = useState(false)
    const [trashConflictData, setTrashConflictData] = useState<TrashConflictData | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)

    const isZip = file?.name.toLowerCase().endsWith('.zip') ?? false

    const doUpload = async (overwriteTrash: boolean = false) => {
        const files = tab === 'file' ? (file ? [file] : []) : Array.from(folderFiles ?? [])
        if (files.length === 0) {
            showNotification('Please select a file', 'error');
            return
        }
        setBusy(true)
        try {
            const fd = new FormData()
            files.forEach((f) => fd.append('files', f))
            await client.post('/files/upload', fd, {
                params: {
                    path: currentPath,
                    description,
                    extract: tab === 'file' && extract,
                    overwriteTrash,
                },
            })
            showNotification('Uploaded successfully', 'success')
            setTrashConflictData(null)
            onUploaded()
            onClose()
        } catch (e: any) {
            if (e?.response?.status === 409 && e?.response?.data?.conflict) {
                setTrashConflictData(e.response.data as TrashConflictData)
            } else {
                showNotification('Upload failed', 'error')
            }
        } finally {
            setBusy(false)
        }
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) {
            setFile(dropped);
            setExtract(false)
        }
    }

    return (

        <DynamicFormDialog open title="Upload" onClose={onClose} width="min(95vw, 520px)"
                footer={
                    <>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={() => doUpload(false)} disabled={busy}>Upload</Button>
                    </>
                }
        >
            {/* Tabs */}
            <div className={styles.uploadTabs}>
                <button className={tab === 'file' ? styles.uploadTabActive : styles.uploadTab}
                        onClick={() => setTab('file')}>File
                </button>
                <button className={tab === 'folder' ? styles.uploadTabActive : styles.uploadTab}
                        onClick={() => setTab('folder')}>Folder
                </button>
            </div>

            {tab === 'file' && (
                <div>
                    <div
                        className={`${styles.dropZone} ${dragging ? styles.dropZoneDragging : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true)
                        }}
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
                            style={{display: 'none'}}
                            onChange={(e) => {
                                setFile(e.target.files?.[0] ?? null);
                                setExtract(false)
                            }}
                        />
                    </div>
                    {isZip && (
                        <div style={{marginTop: 10}}>
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
                            style={{display: 'none'}}
                            /* @ts-expect-error webkitdirectory */
                            webkitdirectory=""
                            multiple
                            onChange={(e) => setFolderFiles(e.target.files)}
                        />
                    </div>
                </div>
            )}

            <div style={{marginTop: 14}}>
                <TextArea
                    label="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                />
            </div>

            {trashConflictData && (
                <TrashConflictModal
                    data={trashConflictData}
                    onCancel={() => setTrashConflictData(null)}
                    onContinue={() => doUpload(true)}
                />
            )}
        </DynamicFormDialog>
    )
}
