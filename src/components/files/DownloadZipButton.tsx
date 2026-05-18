import React from 'react'
import {Button} from '../ui/Button'
import {downloadFilesAsZip} from '../../api/files'

type DownloadZipButtonProps = {
    ids: string[]
    fileName?: string
    onError?: (error: unknown) => void
}

/**
 * Reusable button that downloads the provided IDs (files and/or folders) as a ZIP.
 * - Enabled when at least one ID is provided
 * - Uses the new downloadFilesAsZip API
 */
export function DownloadZipButton({ids, fileName = 'my_selection.zip', onError}: DownloadZipButtonProps) {
    const onClick = async () => {
        try {
            await downloadFilesAsZip(ids, fileName)
        } catch (e) {
            console.error('Download failed', e)
            onError?.(e)
        }
    }

    return (
        <Button
            variant="primary"
            onClick={onClick}
            disabled={ids.length === 0}
        >
            Download ZIP
        </Button>
    )
}

export default DownloadZipButton
type DownloadZipButtonProps = {
    ids: string[]
    fileName?: string
    onError?: (error: unknown) => void
}

type DownloadZipButtonProps = {
    ids: string[]
    fileName?: string
    onError?: (error: unknown) => void
}

/**
 * Reusable button that downloads the provided IDs (files and/or folders) as a ZIP.
 * - Enabled when at least one ID is provided
 * - Uses the new downloadFilesAsZip API
 */
export function DownloadZipButton({ids, fileName = 'my_selection.zip', onError}: DownloadZipButtonProps) {
    const onClick = async () => {
        try {
            await downloadFilesAsZip(ids, fileName)
        } catch (e) {
            console.error('Download failed', e)
            onError?.(e)
        }
    }

    return (
        <Button
            variant="primary"
            onClick={onClick}
            disabled={ids.length === 0}
        >
            Download ZIP
        </Button>
    )
}

export default DownloadZipButton

/**
 * Reusable button that downloads the provided IDs (files and/or folders) as a ZIP.
 * - Enabled when at least one ID is provided
 * - Uses the new downloadFilesAsZip API
 */
export function DownloadZipButton({ids, fileName = 'my_selection.zip', onError}: DownloadZipButtonProps) {
    const onClick = async () => {
        try {
            await downloadFilesAsZip(ids, fileName)
        } catch (e) {
            console.error('Download failed', e)
            onError?.(e)
        }
    }
    import React from 'react'
    import {Button} from '../ui/Button'
    import {downloadFilesAsZip} from '../../api/files'

    type DownloadZipButtonProps = {
        ids: string[]
        fileName?: string
        onError?: (error: unknown) => void
    }

    /**
     * Reusable button that downloads the provided IDs (files and/or folders) as a ZIP.
     * - Enabled when at least one ID is provided
     * - Uses the new downloadFilesAsZip API
     */
    export function DownloadZipButton({ids, fileName = 'my_selection.zip', onError}: DownloadZipButtonProps) {
        const onClick = async () => {
            try {
                await downloadFilesAsZip(ids, fileName)
            } catch (e) {
                console.error('Download failed', e)
                onError?.(e)
            }
        }

        return (
            <Button
                variant="primary"
                onClick={onClick}
                disabled={ids.length === 0}
            >
                Download ZIP
            </Button>
        )
    }

    export default DownloadZipButton
    return (
        <Button
            variant="primary"
            onClick={onClick}
            disabled={ids.length === 0}
        >
            Download ZIP
        </Button>
    )
}

export default DownloadZipButton
type DownloadZipButtonProps = {
    ids: string[]
    fileName?: string
    onError?: (error: unknown) => void
}

/**
 * Reusable button that downloads the provided IDs (files and/or folders) as a ZIP.
 * - Enabled when at least one ID is provided
 * - Uses the new downloadFilesAsZip API
 */
export function DownloadZipButton({ids, fileName = 'my_selection.zip', onError}: DownloadZipButtonProps) {
    const onClick = async () => {
        try {
            await downloadFilesAsZip(ids, fileName)
        } catch (e) {
            console.error('Download failed', e)
            onError?.(e)
        }
    }

    return (
        <Button
            variant="primary"
            onClick={onClick}
            disabled={ids.length === 0}
        >
            Download ZIP
        </Button>
    )
}

export default DownloadZipButton
