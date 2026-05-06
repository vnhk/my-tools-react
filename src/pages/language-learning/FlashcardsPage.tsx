import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { languageLearningApi, ReviewScore, TranslationRecordDetail } from '../../api/languageLearning'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import styles from './FlashcardsPage.module.css'

const ALL_LEVELS = ['N/A', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function playBase64Audio(base64: string) {
    const audio = new Audio(`data:audio/mp3;base64,${base64}`)
    audio.play().catch(() => {})
}

export function FlashcardsPage() {
    const { showError } = useNotification()
    const { pathname } = useLocation()
    const language = pathname.startsWith('/english') ? 'EN' : 'ES'

    const [levels, setLevels] = useState<string[]>([...ALL_LEVELS])
    const [cards, setCards] = useState<TranslationRecordDetail[]>([])
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)

    const currentCard = cards[index] ?? null

    const loadCards = useCallback(async () => {
        if (levels.length === 0) return
        setLoading(true)
        try {
            const res = await languageLearningApi.flashcards(language, levels, 50)
            const shuffled = [...res.data].sort(() => Math.random() - 0.5)
            setCards(shuffled)
            setIndex(0)
            setFlipped(false)
            setLoaded(true)
        } catch {
            showError('Failed to load flashcards')
        } finally {
            setLoading(false)
        }
    }, [language, levels, showError])

    const handleRating = useCallback(async (score: ReviewScore) => {
        if (!currentCard) return
        try {
            await languageLearningApi.review(currentCard.id, score)
        } catch {
            showError('Failed to save rating')
        }
        setFlipped(false)
        setTimeout(() => setIndex((i) => i + 1), 50)
    }, [currentCard, showError])

    const flip = useCallback(() => setFlipped((f) => !f), [])

    const playAudio = useCallback(() => {
        if (!currentCard) return
        const sound = flipped ? currentCard.inSentenceSound : currentCard.textSound
        if (sound) playBase64Audio(sound)
    }, [currentCard, flipped])

    // Keyboard shortcuts
    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        switch (e.key) {
            case ' ': e.preventDefault(); flip(); break
            case 'q': case 'Q': if (flipped) handleRating('AGAIN'); break
            case 'w': case 'W': if (flipped) handleRating('HARD'); break
            case 'e': case 'E': if (flipped) handleRating('GOOD'); break
            case 'r': case 'R': if (flipped) handleRating('EASY'); break
            case 'p': case 'P': playAudio(); break
        }
    }, [flip, flipped, handleRating, playAudio])

    useEffect(() => {
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [handleKey])

    const toggleLevel = (level: string) => {
        setLevels((prev) =>
            prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
        )
    }

    const isDone = loaded && index >= cards.length
    const remaining = loaded ? Math.max(0, cards.length - index) : 0

    return (
        <div className={styles.page}>
            {/* Level filters */}
            <div className={styles.filters}>
                <span className={styles.filterLabel}>Levels:</span>
                {ALL_LEVELS.map((l) => (
                    <label key={l} className={styles.levelCheckbox}>
                        <input type="checkbox" checked={levels.includes(l)} onChange={() => toggleLevel(l)} />
                        {l}
                    </label>
                ))}
                <Button variant="primary" size="sm" onClick={loadCards}>
                    {loading ? 'Loading…' : loaded ? 'Reload' : 'Start'}
                </Button>
            </div>

            {!loaded && !loading && (
                <div className={styles.empty}>Click <strong>Start</strong> to begin reviewing flashcards.</div>
            )}

            {loaded && isDone && (
                <div className={styles.done}>
                    <div className={styles.doneTitle}>Session complete! 🎉</div>
                    <div className={styles.doneText}>You reviewed {cards.length} cards.</div>
                    <br />
                    <Button variant="primary" size="md" onClick={loadCards}>Start again</Button>
                </div>
            )}

            {loaded && !isDone && currentCard && (
                <>
                    <div className={styles.progress}>{index + 1} / {cards.length}</div>

                    {/* Flip card */}
                    <div className={styles.cardScene} onClick={flip}>
                        <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
                            {/* Front */}
                            <div className={styles.cardFace}>
                                {currentCard.level && (
                                    <span className={styles.levelBadge}>{currentCard.level}</span>
                                )}
                                <div className={styles.wordText}>{currentCard.sourceText}</div>
                                {currentCard.inSentence && (
                                    <div className={styles.sentenceText}>{currentCard.inSentence}</div>
                                )}
                                <div className={styles.flipHint}>Click or press Space to flip</div>
                            </div>
                            {/* Back */}
                            <div className={`${styles.cardFace} ${styles.cardBack}`}>
                                <div className={styles.wordText}>{currentCard.textTranslation}</div>
                                {currentCard.inSentenceTranslation && (
                                    <div className={styles.sentenceText}>{currentCard.inSentenceTranslation}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rating buttons (only shown after flip) */}
                    {flipped && (
                        <div className={styles.ratingButtons}>
                            <button className={`${styles.ratingBtn} ${styles.again}`} onClick={() => handleRating('AGAIN')}>
                                Again
                            </button>
                            <button className={`${styles.ratingBtn} ${styles.hard}`} onClick={() => handleRating('HARD')}>
                                Hard
                            </button>
                            <button className={`${styles.ratingBtn} ${styles.good}`} onClick={() => handleRating('GOOD')}>
                                Good
                            </button>
                            <button className={`${styles.ratingBtn} ${styles.easy}`} onClick={() => handleRating('EASY')}>
                                Easy
                            </button>
                        </div>
                    )}

                    {/* Audio button */}
                    {(currentCard.textSound || currentCard.inSentenceSound) && (
                        <Button variant="ghost" size="sm" onClick={playAudio}>🔊 Play audio</Button>
                    )}

                    {/* Keyboard shortcuts hint */}
                    <div className={styles.shortcuts}>
                        <span className={styles.shortcut}><span className={styles.key}>Space</span> flip</span>
                        {flipped && (
                            <>
                                <span className={styles.shortcut}><span className={styles.key}>Q</span> Again</span>
                                <span className={styles.shortcut}><span className={styles.key}>W</span> Hard</span>
                                <span className={styles.shortcut}><span className={styles.key}>E</span> Good</span>
                                <span className={styles.shortcut}><span className={styles.key}>R</span> Easy</span>
                            </>
                        )}
                        <span className={styles.shortcut}><span className={styles.key}>P</span> audio</span>
                    </div>
                </>
            )}
        </div>
    )
}
