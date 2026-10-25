export type MediaType = 'PHOTO' | 'VIDEO'

export interface PhotoItem {
  id: string
  filename: string
  path: string
  extension: string
  mediaType: MediaType
  fileSize: number
  width?: number
  height?: number
  dateTaken: string
  tags: string[]
  favorite: boolean
  description?: string
  durationSeconds?: number
  cameraModel?: string
}

export interface PhotoAlbum {
  id: string
  name: string
  description?: string
  coverPhotoId?: string
  tags?: string[]
  photoIds?: string[]
  createdAt: string
  photoCount: number
}

export interface TagCount {
  tag: string
  count: number
}
