import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FaArrowLeft, FaFolder, FaTag, FaDownload, FaCloudUploadAlt } from 'react-icons/fa'
import type { PhotoAlbum } from './types'
import { fetchAlbum, getAlbumZipDownloadUrl, uploadPhoto } from './api'
import { PhotoTimelinePage } from './PhotoTimelinePage'

export function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>()
  const [album, setAlbum] = useState<PhotoAlbum | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (albumId) {
      fetchAlbum(albumId)
        .then((res) => setAlbum(res.data))
        .catch((e) => console.error('Failed to fetch album:', e))
    }
  }, [albumId])

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !album) return

    setIsUploading(true)
    const initialTags = album.tags && album.tags.length > 0 ? album.tags : [album.name]
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadPhoto(files[i], album.name, initialTags)
      } catch (err) {
        console.error('Failed to upload file to album:', err)
      }
    }
    setIsUploading(false)
    window.dispatchEvent(new CustomEvent('photos-updated'))
    e.target.value = ''
  }

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
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
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
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

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                }}
                title="Upload photos directly to this album"
              >
                <FaCloudUploadAlt />
                <span>{isUploading ? 'Uploading...' : 'Upload to Album'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleUploadFiles}
              />

              <a
                href={getAlbumZipDownloadUrl(albumId)}
                download={`${album.name}.zip`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                }}
                title="Download all photos in this album as a ZIP file"
              >
                <FaDownload />
                <span>Download Album (ZIP)</span>
              </a>
            </div>
          </div>
        )}
      </div>

      <PhotoTimelinePage albumId={albumId} />
    </div>
  )
}
