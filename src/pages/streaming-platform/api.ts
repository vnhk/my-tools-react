import client from '../../api/client'
import type { ProductionSummary, ProductionDetails, VideoInfo } from './types'

export function fetchProductions() {
  return client.get<ProductionSummary[]>('/streaming/productions')
}

export function fetchProductionDetails(name: string) {
  return client.get<ProductionDetails>(`/streaming/productions/${encodeURIComponent(name)}`)
}

export function fetchVideoInfo(productionName: string, videoFolderId: string) {
  return client.get<VideoInfo>(
    `/streaming/light-player/video-info/${encodeURIComponent(productionName)}/${videoFolderId}`
  )
}

export function saveWatchProgress(videoId: string, currentTime: number) {
  return client.post('/streaming/light-player/watch-progress', { videoId, currentTime })
}

export function reloadConfig() {
  return client.post('/streaming/admin/reload-config')
}

export function createProduction(formData: FormData) {
  return client.post('/streaming/admin/productions', formData)
}

export function createSeason(productionName: string, seasonNumber: number) {
  return client.post(
    `/streaming/admin/productions/${encodeURIComponent(productionName)}/seasons`,
    null,
    { params: { seasonNumber } }
  )
}

export function uploadEpisodeMP4(
  productionName: string,
  seasonNumber: number,
  episodeNumber: number,
  file: File
) {
  const fd = new FormData()
  fd.append('file', file)
  return client.post(
    `/streaming/admin/productions/${encodeURIComponent(productionName)}/episodes/mp4`,
    fd,
    { params: { seasonNumber, episodeNumber } }
  )
}

export function uploadEpisodeHLS(productionName: string, seasonNumber: number, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return client.post(
    `/streaming/admin/productions/${encodeURIComponent(productionName)}/episodes/hls`,
    fd,
    { params: { seasonNumber } }
  )
}

export function uploadMovieMP4(productionName: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return client.post(
    `/streaming/admin/productions/${encodeURIComponent(productionName)}/movie/mp4`,
    fd
  )
}

export function uploadSubtitles(productionName: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return client.post(
    `/streaming/admin/productions/${encodeURIComponent(productionName)}/subtitles`,
    fd
  )
}
