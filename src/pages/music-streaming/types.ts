export interface AudioTrack {
  id: string
  title: string
  artist: string
  artists: string[]
  album: string
  albumArtist?: string
  trackNumber?: number
  discNumber?: number
  durationSeconds?: number
  year?: number
  genre?: string
  genres?: string[]
  filename: string
  relativePath: string
  fileSize: number
  format: string
  bitrate?: number
  hasTagMismatch: boolean
  tagMismatchDetails?: string
}

export interface AudioAlbum {
  id: string
  title: string
  artist: string
  artists: string[]
  releaseYear?: number
  genres: string[]
  description?: string
  coverFilename?: string
  hasCover: boolean
  folderPath: string
  tracks: AudioTrack[]
  totalDurationSeconds?: number
  trackCount: number
  isSingle: boolean
  hasTagMismatch: boolean
}

export interface AudioLibrarySummary {
  totalAlbums: number
  totalTracks: number
  totalArtists: number
  totalDurationSeconds: number
  albums: AudioAlbum[]
  genres: string[]
  artists: string[]
}

export interface CreateAlbumRequest {
  title: string
  artist: string
  artists?: string[]
  releaseYear?: number
  genres?: string[]
  description?: string
  isSingle?: boolean
}

export interface UpdateAlbumRequest {
  title: string
  artist: string
  artists?: string[]
  releaseYear?: number
  genres?: string[]
  description?: string
  isSingle?: boolean
}

export interface UpdateTrackRequest {
  title?: string
  artist?: string
  artists?: string[]
  trackNumber?: number
  year?: number
  genre?: string
  genres?: string[]
}

export interface AiEnrichRequest {
  artist?: string
  albumTitle?: string
  trackFilenames?: string[]
}

export interface AiTrackSuggestion {
  originalFilename: string
  trackNumber?: number
  title?: string
  artist?: string
}

export interface AiEnrichResponse {
  albumTitle?: string
  artist?: string
  artists?: string[]
  releaseYear?: number
  genres?: string[]
  description?: string
  tracks?: AiTrackSuggestion[]
}
