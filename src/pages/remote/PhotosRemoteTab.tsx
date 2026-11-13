import {useEffect, useState} from 'react'
import {Button} from '../../components/ui/Button'
import {SelectField} from '../../components/fields/SelectField'
import {TextField} from '../../components/fields/TextField'
import {fetchAlbums, fetchPhotos} from '../photo-library/api'
import type {PhotoAlbum, PhotoItem} from '../photo-library/types'
import styles from './RemoteControlPage.module.css'

interface Props {
    connected: boolean
    send: (action: string, data?: {url?: string}) => void
}

export function PhotosRemoteTab({connected, send}: Props) {
    const [albums, setAlbums] = useState<PhotoAlbum[]>([])
    const [photos, setPhotos] = useState<PhotoItem[]>([])
    const [albumId, setAlbumId] = useState('')
    const [visibleCount, setVisibleCount] = useState(60)
    const [query, setQuery] = useState('')
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true
        fetchAlbums().then(r => { if (active) setAlbums(r.data) }).catch(() => {
            if (active) setError(true)
        })
        return () => { active = false }
    }, [])

    useEffect(() => {
        let active = true
        setLoading(true)
        setError(false)
        fetchPhotos({albumId: albumId || undefined}).then(r => {
            if (active) setPhotos(r.data)
        }).catch(() => { if (active) setError(true) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [albumId])

    useEffect(() => setVisibleCount(60), [albumId, query])
    const matchingPhotos = photos.filter(photo => photo.filename.toLowerCase().includes(query.toLowerCase()))
    const path = albumId ? '/photos/albums/' + encodeURIComponent(albumId) : '/photos'
    return <div className={styles.controls}>
        <div className={styles.row}>
            <Button disabled={!connected} onClick={() => send('PHOTO_PREVIOUS')}>Previous</Button>
            <Button disabled={!connected} onClick={() => send('PHOTO_NEXT')}>Next</Button>
            <Button disabled={!connected} onClick={() => send('PHOTO_SLIDESHOW')}>Slideshow</Button>
            <Button disabled={!connected} onClick={() => send('PHOTO_VIDEO_TOGGLE')}>Play / pause video</Button>
            <Button disabled={!connected} onClick={() => send('PHOTO_CLOSE')}>Close preview</Button>
            <Button disabled={!connected} onClick={() => send('PHOTO_ZOOM_IN')}>Zoom in</Button>
            <Button disabled={!connected} onClick={() => send('PHOTO_ZOOM_OUT')}>Zoom out</Button>
            <Button disabled={!connected} onClick={() => send('PHOTO_ROTATE')}>Rotate</Button>
        </div>
        <SelectField label="Album" value={albumId} onChange={e => setAlbumId(e.target.value)}
            options={[{value: '', label: 'All photos'}, ...albums.map(album => ({value: album.id, label: album.name}))]}/>
        <TextField placeholder="Search photos" value={query} onChange={e => setQuery(e.target.value)}/>
        {error && <p role="alert">Could not load the photo library.</p>}
        {loading ? <p>Loading photos…</p> : <div className={styles.results}>
            {matchingPhotos.slice(0, visibleCount).map(photo =>
                <Button key={photo.id} disabled={!connected} onClick={() =>
                    send('NAVIGATE', {url: path + '?photo=' + encodeURIComponent(photo.id)})}>
                    {photo.filename}
                </Button>)}
            {visibleCount < matchingPhotos.length &&
                <Button onClick={() => setVisibleCount(count => count + 60)}>Load more</Button>}
            {!matchingPhotos.length && <p>No photos found.</p>}
        </div>}
    </div>
}
