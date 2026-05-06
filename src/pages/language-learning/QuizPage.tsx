import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { languageLearningApi, TranslationRecord } from '../../api/languageLearning'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import styles from './QuizPage.module.css'

const ALL_LEVELS = ['N/A', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

interface QuizItem {
    record: TranslationRecord
    sentence: string // sentence with blank (_)
    answer: string   // cleaned word
    userAnswer: string
}

function buildSentence(record: TranslationRecord): { sentence: string; answer: string } | null {
    const raw = record.inSentence
    if (!raw) return null
    const word = record.sourceText
    const answer = word.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻáéíóúüñÁÉÍÓÚÜÑ]/g, '').toUpperCase()
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const sentence = raw.replace(regex, '_______')
    return { sentence, answer }
}

export function QuizPage() {
    const { showError } = useNotification()
    const { pathname } = useLocation()
    const language = pathname.startsWith('/english') ? 'EN' : 'ES'

    const [levels, setLevels] = useState<string[]>([...ALL_LEVELS])
    const [items, setItems] = useState<QuizItem[]>([])
    const [loading, setLoading] = useState(false)
    const [checked, setChecked] = useState(false)

    const toggleLevel = (level: string) => {
        setLevels((prev) =>
            prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
        )
    }

    const loadQuiz = useCallback(async () => {
        if (levels.length === 0) return
        setLoading(true)
        setChecked(false)
        try {
            const res = await languageLearningApi.quiz(language, levels, 50)
            const records = res.data

            // Pick up to 10 records that have inSentence
            const candidates = records
                .filter((r) => r.inSentence && r.inSentence.trim().length > 0)
                .slice(0, 10)

            const quizItems: QuizItem[] = candidates.map((r) => {
                const built = buildSentence(r)
                return {
                    record: r,
                    sentence: built?.sentence ?? r.inSentence ?? '',
                    answer: built?.answer ?? r.sourceText.toUpperCase(),
                    userAnswer: '',
                }
            })
            setItems(quizItems)
        } catch {
            showError('Failed to load quiz')
        } finally {
            setLoading(false)
        }
    }, [language, levels, showError])

    const usedWords = items.map((it) => it.userAnswer).filter(Boolean)
    const wordBank = items.map((it) => it.answer).filter((w, i, arr) => arr.indexOf(w) === i)

    const selectWord = (word: string, idx: number) => {
        if (checked) return
        // Find first unanswered question and assign
        setItems((prev) => {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], userAnswer: word }
            return updated
        })
    }

    const assignWord = (word: string) => {
        if (checked) return
        const emptyIdx = items.findIndex((it) => !it.userAnswer)
        if (emptyIdx === -1) return
        selectWord(word, emptyIdx)
    }

    const clearAnswer = (idx: number) => {
        if (checked) return
        setItems((prev) => {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], userAnswer: '' }
            return updated
        })
    }

    const checkAnswers = () => setChecked(true)

    const correctCount = checked
        ? items.filter((it) => it.userAnswer.trim().toUpperCase() === it.answer).length
        : 0
    const pct = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0

    return (
        <div className={styles.page}>
            {/* Filters */}
            <div className={styles.filters}>
                <span className={styles.filterLabel}>Levels:</span>
                {ALL_LEVELS.map((l) => (
                    <label key={l} className={styles.levelCheckbox}>
                        <input type="checkbox" checked={levels.includes(l)} onChange={() => toggleLevel(l)} />
                        {l}
                    </label>
                ))}
                <Button variant="primary" size="sm" onClick={loadQuiz}>
                    {loading ? 'Loading…' : 'New Quiz'}
                </Button>
            </div>

            {items.length === 0 && !loading && (
                <div className={styles.empty}>Click <strong>New Quiz</strong> to generate questions.</div>
            )}

            {items.length > 0 && (
                <>
                    {/* Word bank */}
                    <div className={styles.wordBank}>
                        <div className={styles.wordBankTitle}>Word bank — click to assign to next blank:</div>
                        {wordBank.map((word) => {
                            const isUsed = usedWords.includes(word)
                            return (
                                <span
                                    key={word}
                                    className={`${styles.wordChip} ${isUsed ? styles.wordChipUsed : ''}`}
                                    onClick={() => !isUsed && assignWord(word)}
                                >
                                    {word}
                                </span>
                            )
                        })}
                    </div>

                    {/* Questions */}
                    <div className={styles.questions}>
                        {items.map((item, idx) => {
                            const isCorrect = checked && item.userAnswer.trim().toUpperCase() === item.answer
                            const isWrong = checked && !isCorrect && item.userAnswer.length > 0
                            return (
                                <div
                                    key={item.record.id}
                                    className={`${styles.questionCard} ${isCorrect ? styles.correct : ''} ${isWrong ? styles.incorrect : ''}`}
                                >
                                    <div className={styles.questionNumber}>#{idx + 1}</div>
                                    <div className={styles.questionSentence}>
                                        {item.sentence.split('_______').map((part, i, arr) => (
                                            <span key={i}>
                                                {part}
                                                {i < arr.length - 1 && (
                                                    <span
                                                        className={styles.blank}
                                                        onClick={() => clearAnswer(idx)}
                                                        title={item.userAnswer ? 'Click to clear' : 'Select from word bank'}
                                                    >
                                                        {item.userAnswer || '?'}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    <div className={styles.clue}>→ {item.record.textTranslation}</div>
                                    {checked && (
                                        <div style={{ color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '13px' }}>
                                            {isCorrect ? '✓ Correct!' : `✗ Answer: ${item.answer}`}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Results */}
                    {checked && (
                        <div className={styles.results}>
                            <div className={styles.score}>{correctCount}/{items.length} ({pct}%)</div>
                            <div className={styles.scoreBar}>
                                <div className={styles.scoreBarFill} style={{ width: `${pct}%` }} />
                            </div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                                {pct === 100 ? 'Perfect! 🎉' : pct >= 80 ? 'Great job! 🌟' : pct >= 50 ? 'Good progress! 💪' : 'Keep going! 📚'}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className={styles.actions}>
                        {!checked && (
                            <Button variant="primary" size="md" onClick={checkAnswers}>
                                Check Answers
                            </Button>
                        )}
                        <Button variant="secondary" size="md" onClick={loadQuiz}>
                            New Quiz
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}
