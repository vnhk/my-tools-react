import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FaArrowLeft, FaFolder, FaTag } from 'react-icons/fa'
import type { PhotoAlbum } from './types'
import { fetchAlbum } from './api'
import { PhotoTimelinePage } from './PhotoTimelinePage'

export function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>()
  const [album, setAlbum] = useState<PhotoAlbum | null>(null)

  useEffect(() => {
    if (albumId) {
      fetchAlbum(albumId)
        .then((res) => setAlbum(res.data))
        .catch((e) => console.error('Failed to fetch album:', e))
    }
  }, [albumId])

  if (!albumId) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <Link
          to="/photos/albums"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            marginBottom: '0.75rem',
          }}
        >
          <FaArrowLeft size={12} />
          <span>Back to Albums</span>
        </Link>

        {album && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FaFolder style={{ color: 'var(--color-primary)', fontSize: '1.5rem' }} />
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{album.name}</h2>
            </div>
            {album.description && (
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {album.description}
              </p>
            )}
            {album.tags && album.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {album.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '11px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    <FaTag size={9} />
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PhotoTimelinePage albumId={albumId} />
    </div>
  )
}
