import { useEffect, useRef, useState, useCallback } from 'react'
import { ebookApi, type Ebook, type Word } from '../../api/ebook'
import { CustomSelect } from '../../components/fields/CustomSelect'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import styles from './NotLearnedWordsPage.module.css'

function WordDialog({
  word,
  onLearn,
  onFlashcard,
  onClose,
}: {
  word: Word
  onLearn: () => void
  onFlashcard: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[') onLearn()
      if (e.key === ']') onFlashcard()
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onLearn, onFlashcard, onClose])

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog}>
        <div className={styles.dialogHeader}>
          <span className={styles.wordTitle}>{word.name}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.dialogCount}>Appears {word.count} times</div>
        <div className={styles.dialogActions}>
          <Button variant="warning" size="md" onClick={onLearn}>
            Mark as learned <kbd className={styles.kbd}>[</kbd>
          </Button>
          <Button variant="primary" size="md" onClick={onFlashcard}>
            Add as flashcard <kbd className={styles.kbd}>]</kbd>
          </Button>
        </div>
        <div className={styles.dialogHint}>Press [ to mark learned · ] to add flashcard · Esc to close</div>
      </div>
    </div>
  )
}

export function NotLearnedWordsPage() {
  const { showSuccess, showError } = useNotification()
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [selectedEbookId, setSelectedEbookId] = useState('')
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogWord, setDialogWord] = useState<Word | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ebookApi.listEbooks().then((res) => {
      setEbooks(res.data ?? [])
      if (res.data?.length) setSelectedEbookId(res.data[0].id)
    }).catch(() => showError('Failed to load ebooks'))
  }, [])

  const loadWords = useCallback(() => {
    if (!selectedEbookId) return
    setLoading(true)
    ebookApi.getNotLearned(selectedEbookId)
      .then((res) => {
        const list = res.data ?? []
        setWords(list)
        if (list.length > 0) setDialogWord(list[0])
      })
      .catch(() => showError('Failed to load words'))
      .finally(() => setLoading(false))
  }, [selectedEbookId])

  useEffect(() => { loadWords() }, [loadWords])

  const removeWordAndAdvance = (word: Word) => {
    setWords((prev) => {
      const next = prev.filter((w) => w.name !== word.name)
      setDialogWord(next.length > 0 ? next[0] : null)
      return next
    })
  }

  const handleLearn = async () => {
    if (!dialogWord) return
    try {
      await ebookApi.markLearned(dialogWord.name)
      showSuccess(`Marked "${dialogWord.name}" as learned`)
      removeWordAndAdvance(dialogWord)
    } catch {
      showError('Failed to mark as learned')
    }
  }

  const handleFlashcard = async () => {
    if (!dialogWord) return
    try {
      await ebookApi.addFlashcard(dialogWord.name)
      showSuccess(`Added "${dialogWord.name}" as flashcard`)
      removeWordAndAdvance(dialogWord)
    } catch {
      showError('Failed to add flashcard')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await ebookApi.importKnownWords(file)
      showSuccess('Known words imported')
      loadWords()
    } catch {
      showError('Failed to import known words')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <CustomSelect
          options={ebooks.map((e) => ({ value: e.id, label: e.ebookName }))}
          value={selectedEbookId}
          onChange={(v) => setSelectedEbookId(String(v))}
          size="sm"
        />
        <Button variant="secondary" size="sm" onClick={loadWords} disabled={!selectedEbookId}>
          Refresh
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          Upload Known Words (CSV)
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      <div className={styles.stats}>
        {loading ? 'Loading…' : `${words.length} unknown words`}
        {!loading && words.length > 0 && ' — click a word to review'}
      </div>

      <div className={styles.wordGrid}>
        {words.map((w) => (
          <button
            key={w.name}
            className={`${styles.wordCard} ${dialogWord?.name === w.name ? styles.wordCardActive : ''}`}
            onClick={() => setDialogWord(w)}
          >
            <span className={styles.wordName}>{w.name}</span>
            <span className={styles.wordCount}>{w.count}×</span>
          </button>
        ))}
        {!loading && words.length === 0 && selectedEbookId && (
          <div className={styles.empty}>No unknown words — great job!</div>
        )}
        {!loading && !selectedEbookId && (
          <div className={styles.empty}>Select an ebook to start</div>
        )}
      </div>

      {dialogWord && (
        <WordDialog
          word={dialogWord}
          onLearn={handleLearn}
          onFlashcard={handleFlashcard}
          onClose={() => setDialogWord(null)}
        />
      )}
    </div>
  )
}
