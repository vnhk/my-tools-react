import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import { shoppingApi, type SearchResponse } from '../../api/shopping'
import { ProductCard } from './ProductsSearchPage'
import styles from './shopping.module.css'

const SHOPS = ['Media Expert', 'RTV Euro AGD', 'Morele', 'Centrum Rowerowe']

export function BestOffersPage() {
  const navigate = useNavigate()
  const { showError } = useNotification()
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [discountMin, setDiscountMin] = useState('10')
  const [discountMax, setDiscountMax] = useState('100')
  const [months, setMonths] = useState('3')
  const [categories, setCategories] = useState<string[]>([])
  const [shop, setShop] = useState('')
  const [name, setName] = useState('')
  const [prevPriceMin, setPrevPriceMin] = useState('')
  const [prevPriceMax, setPrevPriceMax] = useState('')
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    shoppingApi.getCategories()
      .then((r) => setAllCategories(r.data.sort()))
      .catch(() => {})
  }, [])

  const search = (p = 0) => {
    setLoading(true)
    setPage(p)
    shoppingApi.getBestOffers({
      discountMin: discountMin ? Number(discountMin) : undefined,
      discountMax: discountMax ? Number(discountMax) : undefined,
      months: months ? Number(months) : 3,
      categories: categories.length > 0 ? categories : undefined,
      shop: shop || undefined,
      name: name || undefined,
      prevPriceMin: prevPriceMin ? Number(prevPriceMin) : undefined,
      prevPriceMax: prevPriceMax ? Number(prevPriceMax) : undefined,
      page: p,
      size: 20,
    })
      .then((r) => setResult(r.data))
      .catch(() => showError('Search failed'))
      .finally(() => setLoading(false))
  }

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.searchBar}>
        <label>
          Discount Min (%)
          <input type="number" value={discountMin} onChange={(e) => setDiscountMin(e.target.value)} style={{ width: 90 }} />
        </label>
        <label>
          Discount Max (%)
          <input type="number" value={discountMax} onChange={(e) => setDiscountMax(e.target.value)} style={{ width: 90 }} />
        </label>
        <label>
          Months
          <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} style={{ width: 70 }} min={1} max={12} />
        </label>
        <label>
          Shop
          <select value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">All shops</option>
            {SHOPS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Product Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. laptop" />
        </label>
        <label>
          Prev Price Min
          <input type="number" value={prevPriceMin} onChange={(e) => setPrevPriceMin(e.target.value)} style={{ width: 90 }} />
        </label>
        <label>
          Prev Price Max
          <input type="number" value={prevPriceMax} onChange={(e) => setPrevPriceMax(e.target.value)} style={{ width: 90 }} />
        </label>
        <Button variant="primary" onClick={() => search(0)} disabled={loading}>
          Search
        </Button>
      </div>

      {allCategories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                background: categories.includes(cat) ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                color: categories.includes(cat) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: `1px solid ${categories.includes(cat) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {result && (
        <>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Found {result.allFound} offers (page {result.page + 1} of {result.allPages || 1})
          </div>
          {result.items.length === 0 ? (
            <div className={styles.emptyState}>No offers found.</div>
          ) : (
            <div className={styles.productsGrid}>
              {result.items.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => navigate(`/shopping/product/${p.id}`)} />
              ))}
            </div>
          )}
          {result.allPages > 1 && (
            <div className={styles.pagination}>
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => search(page - 1)}>← Prev</Button>
              <span>Page {page + 1} / {result.allPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= result.allPages - 1} onClick={() => search(page + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className={styles.emptyState}>Set filters and click Search to find discounted products.</div>
      )}
    </div>
  )
}
