import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import { shoppingApi, type ProductDto, type SearchResponse } from '../../api/shopping'
import styles from './shopping.module.css'

const SHOPS = ['Media Expert', 'RTV Euro AGD', 'Morele', 'Centrum Rowerowe']

export function ProductsSearchPage() {
  const navigate = useNavigate()
  const { showError } = useNotification()
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [shop, setShop] = useState('')
  const [name, setName] = useState('')
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    shoppingApi.getCategories()
      .then((r) => setCategories(r.data.sort()))
      .catch(() => {})
  }, [])

  const search = (p = 0) => {
    setLoading(true)
    setPage(p)
    shoppingApi.searchProducts({
      category: category || undefined,
      shop: shop || undefined,
      name: name || undefined,
      page: p,
      size: 20,
    })
      .then((r) => setResult(r.data))
      .catch(() => showError('Search failed'))
      .finally(() => setLoading(false))
  }

  return (
    <div className={styles.page}>
      <div className={styles.searchBar}>
        <label>
          Shop
          <select value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">All shops</option>
            {SHOPS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Product Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(0)}
            placeholder="e.g. laptop"
          />
        </label>
        <Button variant="primary" onClick={() => search(0)} disabled={loading}>
          Search
        </Button>
      </div>

      {result && (
        <>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Found {result.allFound} products (page {result.page + 1} of {result.allPages || 1})
          </div>
          {result.items.length === 0 ? (
            <div className={styles.emptyState}>No products found. Try different filters.</div>
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
        <div className={styles.emptyState}>Enter search criteria and click Search.</div>
      )}
    </div>
  )
}

export function ProductCard({ product, onClick }: { product: ProductDto; onClick?: () => void }) {
  const latestPrice = product.prices?.[0]
  const discount = product.discount

  return (
    <div className={styles.productCard} onClick={onClick}>
      <div className={styles.productName}>{product.name}</div>
      <div className={styles.productShop}>{product.shop}</div>
      <div className={styles.productPrices}>
        {latestPrice?.price != null && (
          <span className={styles.currentPrice}>{latestPrice.price.toFixed(2)} PLN</span>
        )}
        {discount != null && discount < 0 && (
          <span className={styles.discount}>{discount.toFixed(1)}%</span>
        )}
        {product.avgPrice != null && (
          <span className={styles.avgPrice}>avg {product.avgPrice.toFixed(2)}</span>
        )}
      </div>
      {product.categories?.length > 0 && (
        <div className={styles.categories}>
          {product.categories.slice(0, 3).map((c) => (
            <span key={c} className={styles.categoryTag}>{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}
