import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Page not found!</h1>
      <h2 className={styles.code}>Error 404</h2>
      <p className={styles.message}>The page you are looking for does not exist or has been moved.</p>
    </div>
  )
}
