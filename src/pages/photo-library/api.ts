import client from '../../api/client'
import type { PhotoItem, PhotoAlbum } from './types'

export interface PhotoQueryParams {
  albumId?: string
  tag?: string
  mediaType?: 'PHOTO' | 'VIDEO'
  favorite?: boolean
  query?: string
}

export function getPhotoFileUrl(id: string): string {
  const token = localStorage.getItem('token')
  const base = `/api/photos/${encodeURIComponent(id)}/file`
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}

export function getPhotoDownloadUrl(id: string): string {
  const token = localStorage.getItem('token')
  const base = `/api/photos/${encodeURIComponent(id)}/file?download=true`
  return token ? `${base}&token=${encodeURIComponent(token)}` : base
}

export function getAlbumZipDownloadUrl(albumId: string): string {
  const token = localStorage.getItem('token')
  const base = `/api/photos/albums/${encodeURIComponent(albumId)}/download-zip`
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}

export async function downloadPhotosZip(ids: string[]) {
  const response = await client.post('/photos/download-zip', ids, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `photos_${Date.now()}.zip`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function getPhotoThumbnailUrl(id: string): string {
  const token = localStorage.getItem('token')
  const base = `/api/photos/${encodeURIComponent(id)}/thumbnail`
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}

export async function fetchPhotos(params?: PhotoQueryParams) {
  return client.get<PhotoItem[]>('/photos', { params })
}

export async function fetchPhoto(id: string) {
  return client.get<PhotoItem>(`/photos/${encodeURIComponent(id)}`)
}

export async function uploadPhoto(file: File, folder?: string, tags?: string[]) {
  const formData = new FormData()
  formData.append('file', file)
  if (folder) formData.append('folder', folder)
  if (tags && tags.length > 0) {
    tags.forEach((t) => formData.append('tags', t))
  }
  return client.post<PhotoItem>('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export async function updatePhotoTags(id: string, tags: string[]) {
  return client.post<PhotoItem>(`/photos/${encodeURIComponent(id)}/tags`, tags)
}

export async function batchUpdateTags(ids: string[], addTags: string[], removeTags: string[]) {
  return client.post<void>('/photos/batch-tags', {
    ids,
    addTags,
    removeTags,
  })
}

export async function toggleFavorite(id: string) {
  return client.post<PhotoItem>(`/photos/${encodeURIComponent(id)}/favorite`)
}

export async function deletePhoto(id: string) {
  return client.delete<void>(`/photos/${encodeURIComponent(id)}`)
}

export async function fetchAlbums() {
  return client.get<PhotoAlbum[]>('/photos/albums')
}

export async function fetchAlbum(id: string) {
  return client.get<PhotoAlbum>(`/photos/albums/${encodeURIComponent(id)}`)
}

export async function saveAlbum(album: Partial<PhotoAlbum>) {
  return client.post<PhotoAlbum>('/photos/albums', album)
}

export async function deleteAlbum(id: string) {
  return client.delete<void>(`/photos/albums/${encodeURIComponent(id)}`)
}

export async function fetchTags() {
  return client.get<Record<string, number>>('/photos/tags')
}

export async function reloadLibrary() {
  return client.post<void>('/photos/reload')
}
