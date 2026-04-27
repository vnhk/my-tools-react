import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import { recipesApi, type RecipeDto } from '../../api/cookBook'
import styles from './RecipeListPage.module.css'

function Stars({ rating, count }: { rating: number | null; count: number | null }) {
  if (!rating) return <span className={styles.noRating}>No ratings</span>
  const full = Math.round(rating)
  return (
    <span className={styles.stars} title={`${rating.toFixed(1)} (${count ?? 0})`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <span className={styles.ratingNum}> {rating.toFixed(1)}</span>
    </span>
  )
}

function ImportDialog({ scrapers, onImport, onClose }: {
  scrapers: string[]
  onImport: (scraperName: string, html: string) => void
  onClose: () => void
}) {
  const [scraper, setScraper] = useState(scrapers[0] ?? '')
  const [html, setHtml] = useState('')

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Import Recipe from HTML</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dialogBody}>
          <label className={styles.dialogLabel}>Scraper</label>
          <select className={styles.dialogSelect} value={scraper} onChange={e => setScraper(e.target.value)}>
            {scrapers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className={styles.dialogLabel}>HTML Content</label>
          <textarea
            className={styles.dialogTextarea}
            value={html}
            onChange={e => setHtml(e.target.value)}
            placeholder="Paste full HTML of the recipe page here..."
            rows={10}
          />
        </div>
        <div className={styles.dialogFooter}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={() => onImport(scraper, html)}>
            Import
          </button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function RecipeListPage() {
  const { showSuccess, showError } = useNotification()
  const [recipes, setRecipes] = useState<RecipeDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterFav, setFilterFav] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [scrapers, setScrapers] = useState<string[]>([])
  const [showImport, setShowImport] = useState(false)
  const PAGE_SIZE = 24

  const load = () => {
    setLoading(true)
    recipesApi.getAll({
      page, size: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(filterTag ? { tag: filterTag } : {}),
      ...(filterFav ? { favorite: true } : {}),
    })
      .then(res => {
        setRecipes(res.data.content ?? [])
        setTotal(res.data.totalElements ?? 0)
      })
      .catch(() => showError('Failed to load recipes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    recipesApi.getTags().then(r => setTags(r.data)).catch(() => {})
    recipesApi.getScrapers().then(r => setScrapers(r.data)).catch(() => {})
  }, [])

  useEffect(() => { setPage(0) }, [search, filterTag, filterFav])
  useEffect(load, [page, search, filterTag, filterFav])

  const handleToggleFav = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    await recipesApi.toggleFavorite(id).catch(() => showError('Failed'))
    load()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    if (!confirm('Delete this recipe?')) return
    await recipesApi.delete(id).catch(() => showError('Failed to delete'))
    load()
  }

  const handleImport = (scraperName: string, html: string) => {
    if (!scraperName || !html.trim()) { showError('Select scraper and paste HTML'); return }
    recipesApi.importHtml(scraperName, html)
      .then(() => { showSuccess('Recipe imported'); setShowImport(false); load() })
      .catch(() => showError('Import failed'))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search recipes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={styles.tagSelect} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          className={`${styles.filterBtn} ${filterFav ? styles.filterActive : ''}`}
          onClick={() => setFilterFav(f => !f)}
        >★ Favorites</button>
        <button className={`${styles.btn} ${styles.accent}`} onClick={() => setShowImport(true)}>
          Import HTML
        </button>
        <Link to="/cook-book/recipes/new" className={`${styles.btn} ${styles.primary}`}>
          + New Recipe
        </Link>
      </div>

      {loading && <div className={styles.state}>Loading...</div>}
      {!loading && recipes.length === 0 && <div className={styles.state}>No recipes found.</div>}

      <div className={styles.grid}>
        {recipes.map(r => (
          <Link key={r.id} to={`/cook-book/recipes/${r.id}`} className={styles.card}>
            <div className={styles.cardImg}>
              {r.mainImageUrl
                ? <img src={r.mainImageUrl} alt={r.name} className={styles.thumb} />
                : <div className={styles.noImg}>🍽</div>
              }
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardName}>{r.name}</div>
              <Stars rating={r.averageRating} count={r.ratingCount} />
              <div className={styles.cardMeta}>
                {r.totalTime != null && <span className={styles.badge}>⏱ {r.totalTime} min</span>}
                {r.servings != null && <span className={styles.badge}>🍽 {r.servings}</span>}
                {r.totalCalories != null && <span className={styles.badge}>🔥 {r.totalCalories} kcal</span>}
              </div>
              {r.tags.length > 0 && (
                <div className={styles.tagRow}>
                  {r.tags.slice(0, 3).map(t => <span key={t} className={styles.tag}>{t}</span>)}
                  {r.tags.length > 3 && <span className={styles.tag}>+{r.tags.length - 3}</span>}
                </div>
              )}
            </div>
            <div className={styles.cardActions}>
              <button
                className={`${styles.iconBtn} ${r.favorite ? styles.favActive : ''}`}
                title="Toggle favorite"
                onClick={e => handleToggleFav(e, r.id)}
              >★</button>
              <button
                className={`${styles.iconBtn} ${styles.danger}`}
                title="Delete"
                onClick={e => handleDelete(e, r.id)}
              >✕</button>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      )}

      {showImport && scrapers.length > 0 && (
        <ImportDialog scrapers={scrapers} onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
