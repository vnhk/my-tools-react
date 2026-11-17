import {useEffect, useState} from 'react'
import {FaInfoCircle} from 'react-icons/fa'
import client from '../../../api/client'
import styles from './UntrackedFilesNotice.module.css'

export function UntrackedFilesNotice({path}: {path: string}) {
    const [extensions, setExtensions] = useState<string[]>([])

    useEffect(() => {
        const controller = new AbortController()
        setExtensions([])
        client.get<string[]>('/files/untracked-extensions', {
            params: {path},
            signal: controller.signal,
        }).then(({data}) => {
            if (!controller.signal.aborted) setExtensions(data)
        }).catch(() => {
            // A failed notice request must not prevent browsing files.
        })
        return () => controller.abort()
    }, [path])

    if (extensions.length === 0) return null

    return (
        <div className={styles.notice} role="note">
            <FaInfoCircle aria-hidden="true"/>
            <span>
                Not all files are listed here. In HLS folders, {extensions.map(ext => `.${ext}`).join(', ')} files
                remain on disk but are not indexed in the file browser. Other files remain listed.
            </span>
        </div>
    )
}
