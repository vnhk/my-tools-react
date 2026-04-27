import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import { fridgeSearchApi, type RecipeMatchDto } from '../../api/cookBook'
import styles from './FridgeSearchPage.module.css'

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  const n = Math.round(rating)
  return <span className={styles.stars}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} {rating.toFixed(1)}</span>
}

export function FridgeSearchPage() {
  const { showError } = useNotification()
  const [input, setInput] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [minCoverage, setMinCoverage] = useState(50)
  const [results, setResults] = useState<RecipeMatchDto[] | null>(null)
  const [loading, setLoading] = useState(false)

  const addIngredient = () => {
    const v = input.trim()
    if (!v || ingredients.includes(v)) return
    setIngredients(prev => [...prev, v])
    setInput('')
  }

  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i))

  const handleSearch = () => {
    if (!ingredients.length) { showError('Add at least one ingredient'); return }
    setLoading(true)
    fridgeSearchApi.search(ingredients, minCoverage)
      .then(r => setResults(r.data))
      .catch(() => showError('Search failed'))
      .finally(() => setLoading(false))
  }

  const handleClear = () => { setIngredients([]); setInput(''); setResults(null) }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Search by Fridge Contents</div>

          <div className={styles.inputRow}>
            <input
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addIngredient() }}
              placeholder="Type ingredient name and press Enter"
            />
            <button className={`${styles.btn} ${styles.primary}`} onClick={addIngredient}>Add</button>
          </div>

          {ingredients.length > 0 && (
            <div className={styles.chips}>
              {ingredients.map((ing, i) => (
                <span key={i} className={styles.chip} onClick={() => removeIngredient(i)}>
                  {ing} ×
                </span>
              ))}
            </div>
          )}

          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Min coverage: {minCoverage}%</label>
              <input
                type="range" min={0} max={100} step={10}
                value={minCoverage}
                onChange={e => setMinCoverage(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <button className={`${styles.btn} ${styles.primary}`} onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search Recipes'}
            </button>
            <button className={styles.btn} onClick={handleClear}>Clear</button>
          </div>
        </div>

        {results !== null && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Results ({results.length} recipes found)</div>

            {results.length === 0 ? (
              <div className={styles.empty}>No matching recipes found. Try lowering coverage or adding more ingredients.</div>
            ) : (
              <div className={styles.resultList}>
                {results.map(r => (
                  <Link key={r.id} to={`/cook-book/recipes/${r.id}`} className={styles.resultRow}>
                    {r.mainImageUrl && <img src={r.mainImageUrl} alt={r.name} className={styles.resultThumb} />}
                    <div className={styles.resultBody}>
                      <div className={styles.resultName}>{r.name}</div>
                      <div className={styles.resultMeta}>
                        <span className={styles.metaBadge}>{r.matchCount} matches</span>
                        <span className={`${styles.metaBadge} ${styles.coverage}`}>{r.coveragePercent.toFixed(0)}% coverage</span>
                        <Stars rating={r.averageRating} />
                      </div>
                      <div className={styles.ingRow}>
                        {r.matched.map(n => (
                          <span key={n} className={`${styles.ingChip} ${styles.matched}`}>{n}</span>
                        ))}
                        {r.missing.map(n => (
                          <span key={n} className={`${styles.ingChip} ${styles.missing}`}>{n}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
