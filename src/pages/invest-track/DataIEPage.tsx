import { useRef, useState } from 'react'
import { useNotification } from '../../components/ui/Notification'
import { dataIEApi } from '../../api/investments'
import styles from './DataIEPage.module.css'

export function DataIEPage() {
  const { showSuccess, showError } = useNotification()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    setExporting(true)
    dataIEApi.export()
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `wallet-snapshots-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        showSuccess('Export ready')
      })
      .catch(() => showError('Export failed'))
      .finally(() => setExporting(false))
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    dataIEApi.import(file)
      .then(res => {
        setImportResult(res.data)
        showSuccess(`Imported ${res.data.imported} records`)
      })
      .catch(() => showError('Import failed'))
      .finally(() => {
        setImporting(false)
        if (fileRef.current) fileRef.current.value = ''
      })
  }

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Export</div>
        <p className={styles.desc}>Download all WalletSnapshot records as a JSON file.</p>
        <button
          className={`${styles.btn} ${styles.primary}`}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export Wallet Snapshots (JSON)'}
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Import</div>
        <p className={styles.desc}>Upload a previously exported JSON file to import WalletSnapshot records.</p>
        <label className={`${styles.btn} ${styles.success} ${importing ? styles.disabled : ''}`}>
          {importing ? 'Importing...' : 'Choose JSON file to import'}
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
            disabled={importing}
          />
        </label>

        {importResult && (
          <div className={styles.result}>
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>Imported:</span>
              <span className={styles.resultSuccess}>{importResult.imported}</span>
            </div>
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>Skipped:</span>
              <span className={styles.resultWarn}>{importResult.skipped}</span>
            </div>
            {importResult.errors.length > 0 && (
              <div className={styles.errors}>
                <div className={styles.resultLabel}>Errors:</div>
                {importResult.errors.map((e, i) => (
                  <div key={i} className={styles.errorRow}>{e}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
