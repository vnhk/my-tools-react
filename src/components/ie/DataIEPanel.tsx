import { useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import styles from './DataIEPanel.module.css'

export interface FieldDef {
  key: string
  label: string
}

interface DataIEPanelProps {
  fields: FieldDef[]
  onImport: (file: File) => Promise<void>
  onExport: (selectedFields: string[], format: 'excel' | 'json') => Promise<void>
}

export function DataIEPanel({ fields, onImport, onExport }: DataIEPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(fields.map((f) => f.key)))
  const [format, setFormat] = useState<'excel' | 'json'>('excel')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const toggleField = (key: string) => {
    const next = new Set(selected)
    next.has(key) ? next.delete(key) : next.add(key)
    setSelected(next)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      await onImport(file)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await onExport(Array.from(selected), format)
      setExportOpen(false)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? 'Importing…' : '↑ Import'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <Button variant="secondary" onClick={() => setExportOpen(true)}>
          ↓ Export
        </Button>
      </div>

      <Dialog
        open={exportOpen}
        title="Select columns to export"
        onClose={() => setExportOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>Uncheck all</Button>
            <Button variant="primary" onClick={handleExport} disabled={exporting || selected.size === 0}>
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
          </>
        }
      >
        <div className={styles.fieldList}>
          {fields.map((f) => (
            <label key={f.key} className={styles.fieldRow}>
              <input
                type="checkbox"
                checked={selected.has(f.key)}
                onChange={() => toggleField(f.key)}
              />
              {f.label}
            </label>
          ))}
        </div>

        <hr className={styles.divider} />

        <div className={styles.formatGroup}>
          <span className={styles.formatLabel}>Format:</span>
          <label className={styles.radio}>
            <input type="radio" value="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} />
            Excel (.xlsx)
          </label>
          <label className={styles.radio}>
            <input type="radio" value="json" checked={format === 'json'} onChange={() => setFormat('json')} />
            JSON (.json)
          </label>
        </div>
      </Dialog>
    </div>
  )
}
