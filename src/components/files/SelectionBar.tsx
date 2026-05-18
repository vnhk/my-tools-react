import React from 'react'
import { Button } from '../ui/Button'
import { DownloadZipButton } from './DownloadZipButton'

type SelectionBarProps = {
  selectedIds: string[]
  onClear?: () => void
  fileName?: string
}

export function SelectionBar({ selectedIds, onClear, fileName = 'my_selection.zip' }: SelectionBarProps) {
  if (selectedIds.length === 0) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      border: '1px solid var(--color-border, #e5e7eb)',
      borderRadius: 8,
      background: 'var(--color-bg-elevated, #fff)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      margin: '8px 0',
    }}>
      <div style={{ fontWeight: 500 }}>{selectedIds.length} selected</div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <DownloadZipButton ids={selectedIds} fileName={fileName} />
        {onClear && <Button variant="ghost" onClick={onClear}>Clear</Button>}
      </div>
    </div>
  )
}

export default SelectionBar
