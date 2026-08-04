// Shared between FilesRemoteTab (phone) and TvFileDisplay (TV) — kept separate
// from files/FilesPage.tsx's own copy to avoid touching that page for this
// read-only remote-display feature.
export interface RemoteFileItem {
  id: string
  filename: string
  path: string
  directory: boolean
  extension: string | null
  fileSize: number | null
  encrypted: boolean
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'mkv'])
const PDF_EXT = new Set(['pdf'])
const TEXT_EXT = new Set(['txt', 'md', 'json', 'xml', 'csv', 'log', 'yaml', 'yml'])

export type ViewerType = 'image' | 'video' | 'pdf' | 'text'

export function getViewerType(item: Pick<RemoteFileItem, 'directory' | 'extension'>): ViewerType | null {
  if (item.directory) return null
  const ext = (item.extension ?? '').toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (PDF_EXT.has(ext)) return 'pdf'
  if (TEXT_EXT.has(ext)) return 'text'
  return null
}
