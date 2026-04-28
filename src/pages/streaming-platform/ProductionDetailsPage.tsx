import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchProductionDetails,
  createSeason,
  uploadEpisodeMP4,
  uploadEpisodeHLS,
  uploadMovieMP4,
  uploadSubtitles,
  reloadConfig,
} from './api'
import type { ProductionDetails } from './types'
import { useAuth } from '../../auth/AuthContext'
import { useNotification } from '../../components/ui/Notification'
import { Button } from '../../components/ui/Button'
import { NumberField } from '../../components/fields/NumberField'
import styles from './ProductionDetailsPage.module.css'

// ---- Admin section ----
function AdminSection({ details, productionName }: { details: ProductionDetails; productionName: string }) {
  const { showNotification } = useNotification()
  const isTvSeries = details.summary.type === 'TV_SERIES'
  const nextSeason = (details.seasons?.length ?? 0) + 1

  const [seasonNum, setSeasonNum] = useState(nextSeason)
  const [episodeNum, setEpisodeNum] = useState(1)
  const [hlsSeasonNum, setHlsSeasonNum] = useState(nextSeason)
  const [busy, setBusy] = useState(false)

  const mp4EpRef = useRef<HTMLInputElement>(null)
  const hlsRef = useRef<HTMLInputElement>(null)
  const movieMp4Ref = useRef<HTMLInputElement>(null)
  const subtitlesRef = useRef<HTMLInputElement>(null)

  const wrap = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      showNotification(`${label} — done`, 'success')
    } catch {
      showNotification(`${label} — failed`, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.adminSection}>
      {isTvSeries ? (
        <>
          <div className={styles.adminBlock}>
            <div className={styles.adminBlockTitle}>Create Season</div>
            <Button variant="secondary" disabled={busy}
              onClick={() => wrap(`Season ${nextSeason}`, () => createSeason(productionName, nextSeason))}>
              + Create Season {nextSeason}
            </Button>
          </div>

          <div className={styles.adminDivider} />

          <div className={styles.adminBlock}>
            <div className={styles.adminBlockTitle}>Upload Episode (MP4)</div>
            <div className={styles.adminRow}>
              <NumberField label="Season #" value={seasonNum} min={1} onChange={(v) => setSeasonNum(v === '' ? 1 : v)} />
              <NumberField label="Episode #" value={episodeNum} min={1} onChange={(v) => setEpisodeNum(v === '' ? 1 : v)} />
              <input ref={mp4EpRef} type="file" accept="video/mp4,.mp4" className={styles.adminFileBtn} />
              <Button variant="secondary" disabled={busy} onClick={() => {
                const f = mp4EpRef.current?.files?.[0]
                if (!f) { showNotification('Select a file first', 'error'); return }
                wrap('Episode MP4', () => uploadEpisodeMP4(productionName, seasonNum, episodeNum, f))
              }}>Upload</Button>
            </div>
          </div>

          <div className={styles.adminDivider} />

          <div className={styles.adminBlock}>
            <div className={styles.adminBlockTitle}>Upload Episode (HLS ZIP)</div>
            <div className={styles.adminRow}>
              <NumberField label="Season #" value={hlsSeasonNum} min={1} onChange={(v) => setHlsSeasonNum(v === '' ? 1 : v)} />
              <input ref={hlsRef} type="file" accept=".zip,application/zip" className={styles.adminFileBtn} />
              <Button variant="secondary" disabled={busy} onClick={() => {
                const f = hlsRef.current?.files?.[0]
                if (!f) { showNotification('Select a file first', 'error'); return }
                wrap('HLS ZIP', () => uploadEpisodeHLS(productionName, hlsSeasonNum, f))
              }}>Upload</Button>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.adminBlock}>
          <div className={styles.adminBlockTitle}>Upload Video (MP4)</div>
          <div className={styles.adminRow}>
            <input ref={movieMp4Ref} type="file" accept="video/mp4,.mp4" className={styles.adminFileBtn} />
            <Button variant="secondary" disabled={busy} onClick={() => {
              const f = movieMp4Ref.current?.files?.[0]
              if (!f) { showNotification('Select a file first', 'error'); return }
              wrap('Movie MP4', () => uploadMovieMP4(productionName, f))
            }}>Upload</Button>
          </div>
        </div>
      )}

      <div className={styles.adminDivider} />

      <div className={styles.adminBlock}>
        <div className={styles.adminBlockTitle}>Upload Subtitles (ZIP)</div>
        <div className={styles.adminRow}>
          <input ref={subtitlesRef} type="file" accept=".zip,application/zip" className={styles.adminFileBtn} />
          <Button variant="secondary" disabled={busy} onClick={() => {
            const f = subtitlesRef.current?.files?.[0]
            if (!f) { showNotification('Select a file first', 'error'); return }
            wrap('Subtitles', () => uploadSubtitles(productionName, f))
          }}>Upload</Button>
        </div>
      </div>

      <div className={styles.adminDivider} />

      <div className={styles.adminBlock}>
        <Button variant="secondary" disabled={busy}
          onClick={() => wrap('Reload config', reloadConfig)}>
          🔄 Reload Config
        </Button>
      </div>
    </div>
  )
}

// ---- Main page ----
export default function ProductionDetailsPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ROLE_USER'

  const [details, setDetails] = useState<ProductionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [openSeasons, setOpenSeasons] = useState<Set<string>>(new Set())
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    if (!name) return
    fetchProductionDetails(name)
      .then((res) => {
        const d = res.data
        setDetails(d)
        if (d.seasons && d.seasons.length > 0) {
          setOpenSeasons(new Set([d.seasons[0].name]))
        }
      })
      .catch(() => navigate('/streaming'))
      .finally(() => setLoading(false))
  }, [name, navigate])

  if (loading) return <div className={styles.loading}>Loading…</div>
  if (!details) return null

  const { summary } = details

  const toggleSeason = (seasonName: string) => {
    setOpenSeasons((prev) => {
      const next = new Set(prev)
      next.has(seasonName) ? next.delete(seasonName) : next.add(seasonName)
      return next
    })
  }

  const yearLabel = (() => {
    if (!summary.releaseYearStart) return null
    if (summary.releaseYearEnd && summary.releaseYearEnd !== summary.releaseYearStart) {
      return `${summary.releaseYearStart}–${summary.releaseYearEnd}`
    }
    return String(summary.releaseYearStart)
  })()

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Link to="/streaming" className={styles.backBtn}>← Back</Link>

        <div className={styles.heroContent}>
          <div className={styles.heroPoster}>
            <img
              src={summary.posterUrl}
              alt={summary.title ?? name}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>

          <div className={styles.heroInfo}>
            <h1>{summary.title || name}</h1>
            <div className={styles.heroMeta}>
              {summary.type === 'TV_SERIES' ? 'TV Series' : 'Movie'}
              {yearLabel && ` · ${yearLabel}`}
              {summary.rating != null && ` · ★ ${summary.rating.toFixed(1)}`}
              {summary.country && ` · ${summary.country}`}
            </div>
            {summary.description && (
              <p className={styles.heroDesc}>{summary.description}</p>
            )}
            {summary.categories && summary.categories.length > 0 && (
              <div className={styles.heroTags}>
                {summary.categories.map((c) => (
                  <span key={c} className={styles.tag}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.episodesSection}>
        {details.seasons && (
          <>
            {details.seasons.map((season) => (
              <div key={season.name} className={styles.seasonAccordion}>
                <button
                  className={styles.seasonHeader}
                  onClick={() => toggleSeason(season.name)}
                >
                  <span>{season.name}</span>
                  <span className={styles.chevron}>
                    {openSeasons.has(season.name) ? '▲' : '▼'}
                  </span>
                </button>
                {openSeasons.has(season.name) && (
                  <div className={styles.episodesList}>
                    {season.episodes.map((ep) => (
                      <Link
                        key={ep.id}
                        to={`/streaming/player/${encodeURIComponent(name!)}/${ep.id}`}
                        className={styles.episodeItem}
                      >
                        <span className={styles.epName}>{ep.name}</span>
                        <span className={styles.epPlay}>▶</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {details.episodes && (
          <div className={styles.episodesFlat}>
            {details.episodes.map((ep) => (
              <Link
                key={ep.id}
                to={`/streaming/player/${encodeURIComponent(name!)}/${ep.id}`}
                className={styles.episodeItem}
              >
                <span className={styles.epName}>{ep.name}</span>
                <span className={styles.epPlay}>▶</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className={styles.adminWrapper}>
          <button className={styles.adminToggleBtn} onClick={() => setShowAdmin((p) => !p)}>
            ⚙ Admin {showAdmin ? '▲' : '▼'}
          </button>
          {showAdmin && <AdminSection details={details} productionName={name!} />}
        </div>
      )}
    </div>
  )
}
