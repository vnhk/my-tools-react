export interface ProductionSummary {
  productionName: string
  title: string | null
  type: 'TV_SERIES' | 'MOVIE' | 'OTHER' | null
  description: string | null
  rating: number | null
  releaseYearStart: number | null
  releaseYearEnd: number | null
  categories: string[]
  tags: string[]
  audioLang: string[]
  country: string | null
  posterUrl: string
  videoFormat: 'MP4' | 'HLS'
}

export interface Episode {
  id: string
  name: string
}

export interface Season {
  name: string
  episodes: Episode[]
}

export interface ProductionDetails {
  summary: ProductionSummary
  seasons: Season[] | null
  episodes: Episode[] | null
}

export interface VideoInfo {
  productionName: string
  videoFolderId: string
  videoName: string
  videoFormat: 'MP4' | 'HLS'
  videoUrl: string
  availableSubtitles: string[]
  subtitleUrls: Record<string, string>
  watchProgress: number
  nextEpisodeId?: string
  prevEpisodeId?: string
}
