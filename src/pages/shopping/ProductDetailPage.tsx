import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import { shoppingApi, type ProductDto } from '../../api/shopping'
import styles from './shopping.module.css'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showError } = useNotification()
  const [product, setProduct] = useState<ProductDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    shoppingApi.getProduct(Number(id))
      .then((r) => {
        const items = r.data?.items
        setProduct(items?.[0] ?? null)
      })
      .catch(() => showError('Failed to load product'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={styles.page}><div className={styles.emptyState}>Loading...</div></div>
  if (!product) return <div className={styles.page}><div className={styles.emptyState}>Product not found.</div></div>

  const latestPrice = product.prices?.[0]

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)' }}>{product.name}</h2>
      </div>

      <div className={styles.card}>
        <h2>Details</h2>
        <div className={styles.detailGrid}>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Shop</span>
            <span className={styles.detailValue}>{product.shop}</span>
          </div>
          {product.offerLink && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Offer Link</span>
              <a href={product.offerLink} target="_blank" rel="noreferrer"
                 style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}>
                Open offer ↗
              </a>
            </div>
          )}
          {latestPrice?.price != null && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Current Price</span>
              <span className={styles.detailValue} style={{ fontWeight: 700 }}>
                {latestPrice.price.toFixed(2)} PLN
              </span>
            </div>
          )}
          {product.avgPrice != null && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Avg Price</span>
              <span className={styles.detailValue}>{product.avgPrice.toFixed(2)} PLN</span>
            </div>
          )}
          {product.minPrice?.price != null && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Min Price</span>
              <span className={styles.detailValue} style={{ color: 'var(--color-success)' }}>
                {product.minPrice.price.toFixed(2)} PLN
                {product.minPrice.formattedDate && ` (${product.minPrice.formattedDate})`}
              </span>
            </div>
          )}
          {product.maxPrice?.price != null && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Max Price</span>
              <span className={styles.detailValue} style={{ color: 'var(--color-danger)' }}>
                {product.maxPrice.price.toFixed(2)} PLN
                {product.maxPrice.formattedDate && ` (${product.maxPrice.formattedDate})`}
              </span>
            </div>
          )}
          {product.discount != null && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Discount vs Avg</span>
              <span className={styles.detailValue} style={{ color: product.discount < 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {product.discount.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {product.categories?.length > 0 && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <div className={styles.detailLabel} style={{ marginBottom: 6 }}>Categories</div>
            <div className={styles.categories}>
              {product.categories.map((c) => (
                <span key={c} className={styles.categoryTag}>{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {product.prices?.length > 0 && (
        <div className={styles.card}>
          <h2>Price History</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Price (PLN)</th>
                  <th>vs Avg</th>
                </tr>
              </thead>
              <tbody>
                {product.prices.map((p, i) => {
                  const diff = product.avgPrice && p.price != null
                    ? ((p.price - product.avgPrice) / product.avgPrice * 100)
                    : null
                  return (
                    <tr key={i}>
                      <td>{p.formattedDate ?? p.date ?? '—'}</td>
                      <td style={{ fontWeight: i === 0 ? 600 : 400 }}>
                        {p.price != null ? p.price.toFixed(2) : '—'}
                      </td>
                      <td style={{ color: diff != null ? (diff < 0 ? 'var(--color-success)' : 'var(--color-danger)') : undefined }}>
                        {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
