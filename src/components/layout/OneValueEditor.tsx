import { useEffect, useState } from 'react'
import { useNotification } from '../ui/Notification'
import styles from './OneValueEditor.module.css'

interface OneValueApi {
  load: (key: string) => Promise<{ content: string | null }>
  save: (key: string, content: string) => Promise<void>
}

interface OneValueEditorProps {
  title: string
  valueKey: string
  api: OneValueApi
  height?: string
}

export function OneValueEditor({ title, valueKey, api, height = '500px' }: OneValueEditorProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    api.load(valueKey)
      .then((data) => setContent(data.content ?? ''))
      .catch(() => showError('Failed to load'))
      .finally(() => setLoading(false))
  }, [valueKey])

  const handleSave = async () => {
    try {
      await api.save(valueKey, content)
      showSuccess('Saved successfully!')
    } catch {
      showError('Failed to save!')
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>{title}</h3>
      <textarea
        className={styles.textarea}
        style={{ height }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button type="button" className={styles.saveBtn} onClick={handleSave}>
        Save
      </button>
    </div>
  )
}
