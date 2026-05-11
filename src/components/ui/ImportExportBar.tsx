import { useRef } from 'react'
import { FaDownload, FaUpload } from 'react-icons/fa'
import client from '../../api/client'
import { useNotification } from './Notification'
import styles from './ImportExportBar.module.css'

type FilterValues = Record<string, string | string[]>

interface ImportExportBarProps {
  exportUrl: string
  importUrl: string
  entityLabel: string
  onImportSuccess?: () => void
  filters?: FilterValues
}

export function ImportExportBar({ exportUrl, importUrl, entityLabel, onImportSuccess, filters }: ImportExportBarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { showSuccess, showError } = useNotification()

  const handleExport = async () => {
    try {
      const res = await client.get(exportUrl, { responseType: 'blob', params: filters })
      const disposition = res.headers['content-disposition'] ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `${entityLabel.toLowerCase()}-export.json`
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showError('Export failed')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post(importUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { imported, skipped, errors } = res.data as { imported: number; skipped: number; errors: string[] }
      if (errors?.length) {
        showError(`Imported ${imported}, skipped ${skipped}. First error: ${errors[0]}`)
      } else {
        showSuccess(`Imported ${imported} record${imported !== 1 ? 's' : ''}`)
      }
      onImportSuccess?.()
    } catch {
      showError('Import failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={handleExport} title={`Export ${entityLabel} as JSON`}>
        <FaDownload />
        <span>Export</span>
      </button>
      <button className={styles.btn} onClick={() => fileRef.current?.click()} title={`Import ${entityLabel} from JSON`}>
        <FaUpload />
        <span>Import</span>
      </button>
      <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  )
}
