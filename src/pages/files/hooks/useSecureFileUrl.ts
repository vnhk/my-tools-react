import {useEffect, useState} from 'react'
import client from '../../../api/client'
import {isHeicFormat, convertHeicToJpegUrl} from '../../../utils/mediaUtils'

export function useSecureFileUrl(fileId: string | undefined, maxSize: number | null, scale: boolean | null = true, filename?: string) {
    const [url, setUrl] = useState<string | undefined>(undefined)
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!fileId) return

        let objectUrl: string | null = null
        let cancelled = false

        async function load() {
            setLoading(true)
            try {
                const res = await client.get(`/files/thumbnail?uuid=${fileId}&maxSize=${maxSize ?? 200}&scale=${scale ?? true}`, {
                    responseType: 'blob'
                })

                if (cancelled) return

                const blob: Blob = res.data
                const isHeic = isHeicFormat(filename) || blob.type === 'image/heic' || blob.type === 'image/heif'
                if (isHeic) {
                    objectUrl = await convertHeicToJpegUrl(blob, `${fileId}_${maxSize}_${scale}`)
                } else {
                    objectUrl = URL.createObjectURL(blob)
                }

                if (!cancelled) {
                    setUrl(objectUrl ?? undefined)
                    setError(false)
                }
            } catch (e) {
                console.error('Failed to load thumbnail:', e)
                if (!cancelled) {
                    setError(true)
                    setUrl(undefined)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [fileId, filename, maxSize, scale])

    return {url, error, loading}
}

