import {useEffect, useState} from 'react'
import {useRemoteControlContext} from '../../components/layout/RemoteControlProvider'
import {createStreamUrl, useSecureFileUrl} from './FilesPage'
import type {ViewerType} from '../remote/fileViewerType'
import styles from './TvFileDisplay.module.css'

interface Shown {
    fileId: string
    viewerType: ViewerType
    filename?: string
}

// TV-side landing page for the "Files" remote tab — a full-viewport, read-only
// screen driven entirely by FILES_SHOW/FILES_STOP remote commands. Nothing on
// this page is clickable; it exists purely to display what the phone picked.
export default function TvFileDisplay() {
    const {subscribe} = useRemoteControlContext()
    const [shown, setShown] = useState<Shown | null>(null)

    useEffect(() => {
        return subscribe((cmd) => {
            if (cmd.action === 'FILES_SHOW' && cmd.fileId && cmd.viewerType) {
                setShown({fileId: cmd.fileId, viewerType: cmd.viewerType as ViewerType, filename: cmd.filename})
            } else if (cmd.action === 'FILES_STOP') {
                setShown(null)
            }
        })
    }, [subscribe])

    const {url: imageUrl} = useSecureFileUrl(
        shown?.viewerType === 'image' ? shown.fileId : undefined,
        2000,
        false
    )

    const [streamUrl, setStreamUrl] = useState<string>()
    const [textContent, setTextContent] = useState<string>('')

    useEffect(() => {
        setStreamUrl(undefined)
        setTextContent('')
        if (!shown) return
        if (shown.viewerType === 'video' || shown.viewerType === 'pdf') {
            createStreamUrl(shown.fileId).then(setStreamUrl).catch(() => {
            })
        } else if (shown.viewerType === 'text') {
            createStreamUrl(shown.fileId)
                .then((url) => fetch(url))
                .then((r) => r.text())
                .then(setTextContent)
                .catch(() => {
                })
        }
    }, [shown])

    return (
        <div className={styles.page}>
            {!shown && <div className={styles.idle}>Waiting for a file from the remote…</div>}

            {shown?.viewerType === 'image' && imageUrl && (
                <img className={styles.image} src={imageUrl} alt={shown.filename ?? ''}/>
            )}

            {shown?.viewerType === 'video' && streamUrl && (
                <video className={styles.video} src={streamUrl} controls={false} autoPlay/>
            )}

            {shown?.viewerType === 'pdf' && streamUrl && (
                <iframe className={styles.pdf} src={streamUrl} title={shown.filename ?? 'document'}/>
            )}

            {shown?.viewerType === 'text' && (
                <pre className={styles.text}>{textContent || 'Loading…'}</pre>
            )}

            {shown?.filename && <div className={styles.filename}>{shown.filename}</div>}
        </div>
    )
}
