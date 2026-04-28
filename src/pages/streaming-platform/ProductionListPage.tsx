import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProductions, reloadConfig, createProduction } from './api'
import type { ProductionSummary } from './types'
import { useAuth } from '../../auth/AuthContext'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { SelectField } from '../../components/fields/SelectField'
import { TextArea } from '../../components/fields/TextArea'
import styles from './ProductionListPage.module.css'

// ---- Filter state ----
interface Filters {
  types: Set<string>
  categories: Set<string>
  countries: Set<string>
  tags: Set<string>
  year: string | null
  minRating: string | null
  audioLang: string | null
}

function emptyFilters(): Filters {
  return { types: new Set(), categories: new Set(), countries: new Set(), tags: new Set(), year: null, minRating: null, audioLang: null }
}

function filtersActive(f: Filters, search: string) {
  return search.trim() !== '' || f.types.size > 0 || f.categories.size > 0 || f.countries.size > 0 ||
    f.tags.size > 0 || f.year != null || f.minRating != null || f.audioLang != null
}

function toggleSet<T>(prev: Set<T>, val: T): Set<T> {
  const next = new Set(prev)
  next.has(val) ? next.delete(val) : next.add(val)
  return next
}

// ---- Card component ----
function ProductionCard({ p, wide }: { p: ProductionSummary; wide?: boolean }) {
  return (
    <Link
      to={`/streaming/production/${encodeURIComponent(p.productionName)}`}
      className={`${styles.card} ${wide ? styles.cardWide : ''}`}
    >
      <div className={styles.poster}>
        <img
          src={p.posterUrl}
          alt={p.title ?? p.productionName}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.cardTitle}>{p.title || p.productionName}</div>
        <div className={styles.cardMeta}>
          {p.releaseYearStart && <span>{p.releaseYearStart}</span>}
          {p.rating != null && <span>★ {p.rating.toFixed(1)}</span>}
          {p.type && <span className={styles.cardType}>{p.type === 'TV_SERIES' ? 'TV' : 'Movie'}</span>}
        </div>
      </div>
    </Link>
  )
}

// ---- Add Production Dialog ----
function AddProductionDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('movie')
  const [format, setFormat] = useState('mp4')
  const [description, setDescription] = useState('')
  const [rating, setRating] = useState('')
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [country, setCountry] = useState('')
  const [categories, setCategories] = useState('')
  const [tags, setTags] = useState('')
  const posterRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!name.trim()) { showNotification('Name is required', 'error'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('type', type)
      fd.append('videoFormat', format)
      if (description) fd.append('description', description)
      if (rating) fd.append('rating', rating)
      if (yearStart) fd.append('yearStart', yearStart)
      if (yearEnd) fd.append('yearEnd', yearEnd)
      if (country) fd.append('country', country)
      if (categories) fd.append('categories', categories)
      if (tags) fd.append('tags', tags)
      if (posterRef.current?.files?.[0]) fd.append('poster', posterRef.current.files[0])
      await createProduction(fd)
      showNotification(`Production "${name}" created`, 'success')
      onCreated()
      onClose()
    } catch {
      showNotification('Failed to create production', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open title="Add Production" onClose={onClose} width="min(90vw, 640px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
        </>
      }
    >
      <TextField label="Name *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className={styles.addRow2}>
        <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value)}
          options={[{ value: 'movie', label: 'Movie' }, { value: 'tv_series', label: 'TV Series' }]} />
        <SelectField label="Video Format" value={format} onChange={(e) => setFormat(e.target.value)}
          options={[{ value: 'mp4', label: 'MP4' }, { value: 'hls', label: 'HLS' }]} />
      </div>
      <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className={styles.addRow2}>
        <NumberField label="Rating (0–10)" value={rating === '' ? '' : Number(rating)} min={0} max={10} step={0.1}
          onChange={(v) => setRating(v === '' ? '' : String(v))} />
        <TextField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
      <div className={styles.addRow2}>
        <NumberField label="Year Start" value={yearStart === '' ? '' : Number(yearStart)} min={1900} max={2100}
          onChange={(v) => setYearStart(v === '' ? '' : String(v))} />
        <NumberField label="Year End" value={yearEnd === '' ? '' : Number(yearEnd)} min={1900} max={2100}
          onChange={(v) => setYearEnd(v === '' ? '' : String(v))} />
      </div>
      <TextField label="Categories (comma-separated)" value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="Action, Drama, Sci-Fi" />
      <TextField label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
      <div className={styles.addField}>
        <label className={styles.addLabel}>Poster (image)</label>
        <input ref={posterRef} className={styles.addFileInput} type="file" accept="image/*" />
      </div>
    </Dialog>
  )
}

// ---- Main page ----
export default function ProductionListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ROLE_USER'
  const { showNotification } = useNotification()

  const [productions, setProductions] = useState<ProductionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [reloading, setReloading] = useState(false)

  const load = () => {
    setLoading(true)
    fetchProductions()
      .then((res) => setProductions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Derived filter options from actual data
  const options = useMemo(() => {
    const cats = new Set<string>()
    const countries = new Set<string>()
    const tags = new Set<string>()
    const years = new Set<string>()
    const langs = new Set<string>()
    for (const p of productions) {
      p.categories?.forEach((c) => cats.add(c))
      if (p.country) countries.add(p.country)
      p.tags?.forEach((t) => tags.add(t))
      if (p.releaseYearStart) years.add(String(p.releaseYearStart))
      p.audioLang?.forEach((l) => langs.add(l))
    }
    return {
      categories: [...cats].sort(),
      countries: [...countries].sort(),
      tags: [...tags].sort(),
      years: [...years].sort((a, b) => Number(b) - Number(a)),
      langs: [...langs].sort(),
    }
  }, [productions])

  const isActive = filtersActive(filters, search)

  const filtered = useMemo(() => {
    if (!isActive) return productions
    const q = search.toLowerCase().trim()
    return productions.filter((p) => {
      if (q) {
        const hit = p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.categories?.some((c) => c.toLowerCase().includes(q)) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
        if (!hit) return false
      }
      if (filters.types.size > 0 && !filters.types.has(p.type ?? '')) return false
      if (filters.categories.size > 0 && !p.categories?.some((c) => filters.categories.has(c))) return false
      if (filters.countries.size > 0 && !filters.countries.has(p.country ?? '')) return false
      if (filters.tags.size > 0 && !p.tags?.some((t) => filters.tags.has(t))) return false
      if (filters.year && String(p.releaseYearStart) !== filters.year) return false
      if (filters.minRating && (p.rating == null || p.rating < Number(filters.minRating))) return false
      if (filters.audioLang && !p.audioLang?.includes(filters.audioLang)) return false
      return true
    })
  }, [productions, search, filters, isActive])

  // Category sections for default (non-filtered) view
  const categorySections = useMemo(() => {
    const map = new Map<string, ProductionSummary[]>()
    for (const p of productions) {
      const cats = p.categories?.length ? p.categories : ['Uncategorized']
      for (const c of cats) {
        if (!map.has(c)) map.set(c, [])
        map.get(c)!.push(p)
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
  }, [productions])

  // Filtered view grouped by type
  const filteredSections = useMemo(() => {
    const movies = filtered.filter((p) => p.type === 'MOVIE')
    const tv = filtered.filter((p) => p.type === 'TV_SERIES')
    const other = filtered.filter((p) => p.type !== 'MOVIE' && p.type !== 'TV_SERIES')
    const out: { title: string; items: ProductionSummary[] }[] = []
    if (movies.length) out.push({ title: `🎬 Movies (${movies.length})`, items: movies })
    if (tv.length) out.push({ title: `📺 TV Series (${tv.length})`, items: tv })
    if (other.length) out.push({ title: `🎭 Other (${other.length})`, items: other })
    return out
  }, [filtered])

  const handleReload = async () => {
    setReloading(true)
    try {
      await reloadConfig()
      showNotification('Config reloaded', 'success')
      load()
    } catch {
      showNotification('Failed to reload config', 'error')
    } finally {
      setReloading(false)
    }
  }

  const clearFilters = () => { setFilters(emptyFilters()); setSearch('') }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Streaming</h1>
        <div className={styles.headerActions}>
          {isAdmin && (
            <>
              <button className={styles.iconBtn} onClick={handleReload} disabled={reloading} title="Reload Config">
                🔄 {reloading ? '…' : 'Reload'}
              </button>
              <button className={styles.iconBtn} onClick={() => setShowAddDialog(true)} title="Add Production">
                ＋ New Production
              </button>
            </>
          )}
          <button
            className={showFilters ? styles.iconBtnActive : styles.iconBtn}
            onClick={() => setShowFilters((p) => !p)}
            title="Filters"
          >
            ⚙ Filters{isActive && !showFilters ? ' •' : ''}
          </button>
          <Link to="/streaming/remote" className={styles.iconBtn}>📱 Remote</Link>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search title, description, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Type</span>
            <div className={styles.filterChips}>
              {(['MOVIE', 'TV_SERIES', 'OTHER'] as const).map((t) => (
                <button
                  key={t}
                  className={filters.types.has(t) ? styles.chipActive : styles.chip}
                  onClick={() => setFilters((f) => ({ ...f, types: toggleSet(f.types, t) }))}
                >
                  {t === 'MOVIE' ? 'Movie' : t === 'TV_SERIES' ? 'TV Series' : 'Other'}
                </button>
              ))}
            </div>
          </div>

          {options.categories.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Category</span>
              <div className={styles.filterChips}>
                {options.categories.map((c) => (
                  <button
                    key={c}
                    className={filters.categories.has(c) ? styles.chipActive : styles.chip}
                    onClick={() => setFilters((f) => ({ ...f, categories: toggleSet(f.categories, c) }))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {options.countries.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Country</span>
              <div className={styles.filterChips}>
                {options.countries.map((c) => (
                  <button
                    key={c}
                    className={filters.countries.has(c) ? styles.chipActive : styles.chip}
                    onClick={() => setFilters((f) => ({ ...f, countries: toggleSet(f.countries, c) }))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {options.tags.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Tags</span>
              <div className={styles.filterChips}>
                {options.tags.map((t) => (
                  <button
                    key={t}
                    className={filters.tags.has(t) ? styles.chipActive : styles.chip}
                    onClick={() => setFilters((f) => ({ ...f, tags: toggleSet(f.tags, t) }))}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.filterRow}>
            {options.years.length > 0 && (
              <>
                <span className={styles.filterLabel}>Year</span>
                <div className={styles.filterChips}>
                  {options.years.map((y) => (
                    <button
                      key={y}
                      className={filters.year === y ? styles.chipActive : styles.chip}
                      onClick={() => setFilters((f) => ({ ...f, year: f.year === y ? null : y }))}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Rating</span>
            <div className={styles.filterChips}>
              {['6', '7', '8', '9'].map((r) => (
                <button
                  key={r}
                  className={filters.minRating === r ? styles.chipActive : styles.chip}
                  onClick={() => setFilters((f) => ({ ...f, minRating: f.minRating === r ? null : r }))}
                >
                  {r}+
                </button>
              ))}
            </div>
          </div>

          {options.langs.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Audio</span>
              <div className={styles.filterChips}>
                {options.langs.map((l) => (
                  <button
                    key={l}
                    className={filters.audioLang === l ? styles.chipActive : styles.chip}
                    onClick={() => setFilters((f) => ({ ...f, audioLang: f.audioLang === l ? null : l }))}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isActive && (
            <button className={styles.filterClearBtn} onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : isActive ? (
          // Filtered view — grouped by type
          filteredSections.length === 0 ? (
            <div className={styles.empty}>No productions found.</div>
          ) : (
            filteredSections.map(({ title, items }) => (
              <div key={title} className={styles.section}>
                <div className={styles.sectionTitle}>{title}</div>
                <div className={styles.grid}>
                  {items.map((p) => <ProductionCard key={p.productionName} p={p} wide />)}
                </div>
              </div>
            ))
          )
        ) : (
          // Default view — Netflix carousels by category
          categorySections.map(([cat, items]) => (
            <div key={cat} className={styles.categorySection}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryTitle}>📂 {cat}</span>
                <span className={styles.categoryCount}>{items.length}</span>
              </div>
              <div className={styles.carousel}>
                {items.map((p) => <ProductionCard key={p.productionName} p={p} />)}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddDialog && (
        <AddProductionDialog
          onClose={() => setShowAddDialog(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
