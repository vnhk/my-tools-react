import client from '../../api/client'
import type {
  AudioAlbum,
  AudioLibrarySummary,
  AudioTrack,
  UpdateAlbumRequest,
  UpdateTrackRequest,
  AiEnrichRequest,
  AiEnrichResponse,
  AudioPlaylist,
  SavePlaylistRequest,
  AudioZipImportResult,
} from './types'

export function appendToken(url: string): string {
  const token = localStorage.getItem('token')
  if (!token) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}

export function fetchAudioSummary(params?: {
  query?: string
  genre?: string
  artist?: string
  year?: number
}) {
  return client.get<AudioLibrarySummary>('/audio/summary', { params })
}

export function fetchAlbums(params?: {
  query?: string
  genre?: string
  artist?: string
  year?: number
}) {
  return client.get<AudioAlbum[]>('/audio/albums', { params })
}

export function fetchAlbum(albumId: string) {
  return client.get<AudioAlbum>(`/audio/albums/${encodeURIComponent(albumId)}`)
}

export function getCoverUrl(albumId: string): string {
  return appendToken(`/api/audio/albums/${encodeURIComponent(albumId)}/cover`)
}

export function getTrackStreamUrl(trackId: string): string {
  return appendToken(`/api/audio/tracks/${encodeURIComponent(trackId)}/stream`)
}

export function getTrackDownloadUrl(trackId: string): string {
  return appendToken(`/api/audio/download/tracks/${encodeURIComponent(trackId)}`)
}

export function getAlbumZipDownloadUrl(albumId: string): string {
  return appendToken(`/api/audio/download/albums/${encodeURIComponent(albumId)}`)
}

export function getAlbumPlaylistDownloadUrl(albumId: string): string {
  return appendToken(`/api/audio/download/albums/${encodeURIComponent(albumId)}/playlist.m3u8`)
}

export function getLibraryZipDownloadUrl(): string {
  return appendToken('/api/audio/download/library')
}

export function getMasterPlaylistDownloadUrl(): string {
  return appendToken('/api/audio/download/library/playlist.m3u8')
}

export function createAlbum(formData: FormData) {
  return client.post<AudioAlbum>('/audio/admin/albums', formData)
}

export function updateAlbum(albumId: string, data: UpdateAlbumRequest) {
  return client.put<AudioAlbum>(`/audio/admin/albums/${encodeURIComponent(albumId)}`, data)
}

export function deleteAlbum(albumId: string) {
  return client.delete(`/audio/admin/albums/${encodeURIComponent(albumId)}`)
}

export function uploadAlbumCover(albumId: string, file: File) {
  const fd = new FormData()
  fd.append('cover', file)
  return client.post(`/audio/admin/albums/${encodeURIComponent(albumId)}/cover`, fd)
}

export function synchronizeTags(albumId: string) {
  return client.post(`/audio/admin/albums/${encodeURIComponent(albumId)}/sync-tags`)
}

export function addTrackToAlbum(
  albumId: string,
  file: File,
  title?: string,
  artist?: string,
  trackNumber?: number,
  genres?: string
) {
  const fd = new FormData()
  fd.append('file', file)
  if (title) fd.append('title', title)
  if (artist) fd.append('artist', artist)
  if (trackNumber !== undefined) fd.append('trackNumber', String(trackNumber))
  if (genres) fd.append('genres', genres)
  return client.post<AudioTrack>(`/audio/admin/albums/${encodeURIComponent(albumId)}/tracks`, fd)
}

export function uploadTrackAuto(
  file: File,
  title?: string,
  artist?: string,
  album?: string,
  genre?: string,
  trackNumber?: number,
  isSingle = false
) {
  const fd = new FormData()
  fd.append('file', file)
  if (title) fd.append('title', title)
  if (artist) fd.append('artist', artist)
  if (album) fd.append('album', album)
  if (genre) fd.append('genre', genre)
  if (trackNumber !== undefined) fd.append('trackNumber', String(trackNumber))
  if (isSingle) fd.append('isSingle', 'true')
  return client.post<AudioTrack>('/audio/admin/upload-track-auto', fd)
}

export function updateTrack(albumId: string, trackId: string, data: UpdateTrackRequest) {
  return client.put<AudioTrack>(
    `/audio/admin/albums/${encodeURIComponent(albumId)}/tracks/${encodeURIComponent(trackId)}`,
    data
  )
}

export function deleteTrack(albumId: string, trackId: string) {
  return client.delete(
    `/audio/admin/albums/${encodeURIComponent(albumId)}/tracks/${encodeURIComponent(trackId)}`
  )
}

export function uploadZip(file: File, artist?: string, albumTitle?: string, autoSort = true) {
  const fd = new FormData()
  fd.append('file', file)
  if (artist) fd.append('artist', artist)
  if (albumTitle) fd.append('albumTitle', albumTitle)
  fd.append('autoSort', String(autoSort))
  return client.post<AudioZipImportResult>('/audio/admin/upload-zip', fd)
}

export function enrichMetadataWithAi(request: AiEnrichRequest) {
  return client.post<AiEnrichResponse>('/audio/admin/enrich', request)
}

export function reloadAudioConfig() {
  return client.post('/audio/admin/reload')
}

export function fetchPlaylists() {
  return client.get<AudioPlaylist[]>('/audio/playlists')
}

export function fetchPlaylist(id: string) {
  return client.get<AudioPlaylist>(`/audio/playlists/${encodeURIComponent(id)}`)
}

export function savePlaylist(request: SavePlaylistRequest) {
  return client.post<AudioPlaylist>('/audio/playlists', request)
}

export function deletePlaylist(id: string) {
  return client.delete(`/audio/playlists/${encodeURIComponent(id)}`)
}

export function getPlaylistM3u8Url(id: string): string {
  return appendToken(`/api/audio/playlists/${encodeURIComponent(id)}/stream`)
}
