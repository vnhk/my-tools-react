import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Dialog } from '../../components/ui/Dialog'
import { TextArea } from '../../components/fields/TextArea'
import { interviewSessionsApi, InterviewSessionDetail, SessionQuestionDto, SessionCodingTaskDto } from '../../api/interview'
import styles from './InterviewSessionPage.module.css'

const ANSWER_STATUSES = [
    { value: 'NOT_ASKED', label: 'Not Asked', color: 'neutral' },
    { value: 'CORRECT', label: 'Correct', color: 'success' },
    { value: 'PARTIAL', label: 'Partial', color: 'warning' },
    { value: 'INCORRECT', label: 'Incorrect', color: 'danger' },
] as const

const DIFFICULTY_COLORS: Record<number, string> = {
    1: 'var(--color-success)',
    2: 'var(--color-info)',
    3: 'var(--color-warning)',
    4: 'var(--color-danger)',
    5: 'var(--color-danger)',
}

export function InterviewSessionPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { showSuccess, showError } = useNotification()

    const [session, setSession] = useState<InterviewSessionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [questions, setQuestions] = useState<SessionQuestionDto[]>([])
    const [codingTasks, setCodingTasks] = useState<SessionCodingTaskDto[]>([])
    const [globalNotes, setGlobalNotes] = useState('')
    const [feedback, setFeedback] = useState('')
    const [openAnswerId, setOpenAnswerId] = useState<string | null>(null)
    const [aiDialogOpen, setAiDialogOpen] = useState(false)
    const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const load = async () => {
        if (!id) return
        try {
            const res = await interviewSessionsApi.getById(id)
            const s = res.data
            setSession(s)
            setGlobalNotes(s.notes ?? '')
            setFeedback(s.feedback ?? '')
            setQuestions([...(s.sessionQuestions ?? [])])
            setCodingTasks([...(s.sessionCodingTasks ?? [])])
        } catch {
            showError('Failed to load session')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
    }, [id])

    useEffect(() => {
        if (!session || session.status !== 'IN_PROGRESS') return
        autoSaveRef.current = setInterval(() => autoSave(), 2 * 60 * 1000)
        return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
    }, [session?.status, id])

    const buildUpdatePayload = (overrides?: { status?: string; feedback?: string }) => ({
        notes: globalNotes,
        status: overrides?.status ?? session?.status,
        feedback: overrides?.feedback ?? feedback,
        sessionQuestions: questions.map(q => ({
            id: q.id,
            score: q.score ?? 0,
            notes: q.notes ?? '',
            answerStatus: q.answerStatus,
        })),
        sessionCodingTasks: codingTasks.map(ct => ({
            id: ct.id,
            score: ct.score ?? 0,
            notes: ct.notes ?? '',
        })),
    })

    const autoSave = async () => {
        if (!id || !session || session.status !== 'IN_PROGRESS') return
        try {
            await interviewSessionsApi.update(id, buildUpdatePayload())
        } catch { /* silently ignore autosave errors */ }
    }

    const handleSave = async () => {
        if (!id) return
        try {
            await interviewSessionsApi.update(id, buildUpdatePayload())
            showSuccess('Session saved.')
        } catch {
            showError('Failed to save session')
        }
    }

    const handleComplete = async () => {
        if (!id) return
        if (autoSaveRef.current) clearInterval(autoSaveRef.current)
        try {
            const res = await interviewSessionsApi.update(id, buildUpdatePayload({ status: 'COMPLETED' }))
            setSession(res.data)
            setQuestions([...(res.data.sessionQuestions ?? [])])
            setCodingTasks([...(res.data.sessionCodingTasks ?? [])])
            showSuccess('Interview completed!')
        } catch {
            showError('Failed to complete interview')
        }
    }

    const setQuestionField = (qId: string, field: keyof SessionQuestionDto, value: unknown) => {
        setQuestions(qs => qs.map(q => q.id === qId ? { ...q, [field]: value } : q))
    }

    const setCodingTaskField = (ctId: string, field: keyof SessionCodingTaskDto, value: unknown) => {
        setCodingTasks(cts => cts.map(ct => ct.id === ctId ? { ...ct, [field]: value } : ct))
    }

    const buildAiPrompt = () => {
        const relevant = questions.filter(q => q.answerStatus !== 'NOT_ASKED' || (q.notes ?? '').trim())
        let prompt = 'Please prepare a detailed evaluation of the candidate\'s technical skills based on the interview data provided below.\n\n'
        prompt += 'For each skill area listed in Main Skills and Secondary Skills, write a separate evaluation paragraph.\n'
        prompt += 'Take into account the candidate\'s score, answer quality, and any additional notes.\n'
        prompt += 'At the end, provide a short overall summary and a clear recommendation on whether the candidate should be selected.\n\n'
        prompt += '---\n\n'
        prompt += `MAIN SKILLS: ${session?.mainTags ?? '—'}\n`
        prompt += `SECONDARY SKILLS: ${session?.secondaryTags ?? '—'}\n\n`
        if (globalNotes.trim()) prompt += `INTERVIEW NOTES:\n${globalNotes.trim()}\n\n`
        prompt += 'QUESTIONS & ANSWERS:\n\n'
        for (const q of relevant) {
            prompt += `Question: ${q.questionName ?? '—'}\n`
            prompt += `Status: ${q.answerStatus}\n`
            prompt += `Score: ${q.score ?? 0} / ${q.maxPoints ?? '?'}\n`
            if ((q.notes ?? '').trim()) prompt += `Interviewer Notes: ${q.notes!.trim()}\n`
            prompt += '\n'
        }
        return prompt
    }

    const calcTotalScore = () => {
        const asked = questions.filter(q => q.answerStatus !== 'NOT_ASKED')
        const score = asked.reduce((s, q) => s + (q.score ?? 0), 0)
        const max = asked.reduce((s, q) => s + (q.maxPoints ?? 0), 0)
        return { score, max, pct: max > 0 ? Math.round(score / max * 100) : 0 }
    }

    const calcCodingScore = () => codingTasks.reduce((s, ct) => s + (ct.score ?? 0), 0)

    if (loading) return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>
    if (!session) return <div className={styles.page}><div className={styles.loading}>Session not found.</div></div>

    const isCompleted = session.status === 'COMPLETED'

    const renderPlanSection = (planTemplate: string | null) => {
        if (!planTemplate?.trim()) return null
        const resolved = planTemplate
            .replace('{candidateName}', session.candidateName ?? '')
            .replace('{configName}', session.configName ?? '')
            .replace('{mainTags}', session.mainTags ?? '')
            .replace('{secondaryTags}', session.secondaryTags ?? '')
            .replace('{totalQuestions}', String(session.totalQuestions ?? 0))

        const parts = resolved.split(/(\{questions\}|\{codingTasks\})/g)
        return parts.map((part, i) => {
            if (part === '{questions}') return <div key={i}>{questions.map(q => renderQuestionCard(q))}</div>
            if (part === '{codingTasks}') return <div key={i}>{codingTasks.map(ct => renderCodingTaskCard(ct))}</div>
            if (!part.trim()) return null
            return (
                <div key={i} className={styles.scriptBlock}>
                    {part}
                </div>
            )
        })
    }

    const renderQuestionCard = (q: SessionQuestionDto) => {
        const diffColor = DIFFICULTY_COLORS[q.questionDifficulty ?? 1] ?? 'var(--color-text-secondary)'
        const isOpen = openAnswerId === q.id

        return (
            <div
                key={q.id}
                className={`${styles.questionCard} ${styles[`status_${q.answerStatus}`] ?? ''}`}
                onClick={() => {
                    if (!q.answerDetails) return
                    setOpenAnswerId(isOpen ? null : q.id)
                }}
            >
                <div className={styles.questionHeader}>
                    <span className={styles.questionNumber}>#{q.questionNumber}</span>
                    <span className={styles.questionName}>{q.questionName ?? '—'}</span>
                    <span className={styles.diffBadge} style={{ color: diffColor, borderColor: diffColor }}>
                        Lvl {q.questionDifficulty ?? '?'}
                    </span>
                    {q.questionTags && <span className={styles.tags}>{q.questionTags}</span>}
                    {(q.maxPoints ?? 0) > 0 && <span className={styles.points}>max {q.maxPoints} pts</span>}
                </div>

                {q.questionDetails && (
                    <div className={styles.questionText}>{q.questionDetails}</div>
                )}

                {q.answerDetails && isOpen && (
                    <div className={styles.answerBlock}>{q.answerDetails}</div>
                )}

                <div className={styles.statusRow} onClick={e => e.stopPropagation()}>
                    {ANSWER_STATUSES.map(s => (
                        <button
                            key={s.value}
                            className={`${styles.statusBtn} ${q.answerStatus === s.value ? styles[`active_${s.color}`] : ''}`}
                            onClick={() => setQuestionField(q.id, 'answerStatus', s.value)}
                        >
                            {s.label}
                        </button>
                    ))}
                    <input
                        className={styles.scoreInput}
                        type="number"
                        min={0}
                        max={q.maxPoints ?? 100}
                        value={q.score ?? 0}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setQuestionField(q.id, 'score', Math.max(0, Math.min(Number(e.target.value), q.maxPoints ?? 100)))}
                    />
                </div>

                <div onClick={e => e.stopPropagation()}>
                    <textarea
                        className={styles.notesInput}
                        placeholder="Notes..."
                        value={q.notes ?? ''}
                        onChange={e => setQuestionField(q.id, 'notes', e.target.value)}
                    />
                </div>
            </div>
        )
    }

    const renderCodingTaskCard = (ct: SessionCodingTaskDto) => (
        <div key={ct.id} className={styles.codingCard}>
            <div className={styles.questionHeader}>
                <span className={styles.codingNumber} style={{ color: 'var(--color-primary)' }}>#{ct.taskNumber}</span>
                <span className={styles.questionName}>{ct.codingTaskName ?? '—'}</span>
                <Badge color="primary">Coding Task</Badge>
            </div>

            {ct.initialCode && (
                <details className={styles.codeDetails}>
                    <summary>Initial Code</summary>
                    <pre className={styles.codeBlock}>{ct.initialCode}</pre>
                </details>
            )}
            {ct.exampleCode && (
                <details className={styles.codeDetails}>
                    <summary>Example Solution</summary>
                    <pre className={styles.codeBlock}>{ct.exampleCode}</pre>
                </details>
            )}
            {ct.taskQuestions && (
                <details className={styles.codeDetails}>
                    <summary>Task Questions</summary>
                    <div className={styles.questionText}>{ct.taskQuestions}</div>
                </details>
            )}

            <div className={styles.statusRow}>
                <label style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Score:</label>
                <input
                    className={styles.scoreInput}
                    type="number"
                    min={0}
                    value={ct.score ?? 0}
                    onChange={e => setCodingTaskField(ct.id, 'score', Math.max(0, Number(e.target.value)))}
                />
            </div>
            <textarea
                className={styles.notesInput}
                placeholder="Notes..."
                value={ct.notes ?? ''}
                onChange={e => setCodingTaskField(ct.id, 'notes', e.target.value)}
            />
        </div>
    )

    const { score, max, pct } = calcTotalScore()
    const codingScore = calcCodingScore()

    return (
        <div className={styles.page}>
            <div className={styles.sessionHeader}>
                <div className={styles.titleRow}>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/interview/sessions')}>← Back</Button>
                    <h2 className={styles.title}>Interview: {session.candidateName}</h2>
                    <Badge color={session.status === 'IN_PROGRESS' ? 'info' : 'success'}>
                        {session.status.replace('_', ' ')}
                    </Badge>
                </div>
                <div className={styles.metaRow}>
                    Config: {session.configName} | Tags: {session.mainTags}{session.secondaryTags ? `, ${session.secondaryTags}` : ''} | Questions: {session.totalQuestions ?? 0}
                </div>
            </div>

            <TextArea
                label="Interview Notes"
                value={globalNotes}
                onChange={e => setGlobalNotes(e.target.value)}
            />

            <div className={styles.content}>
                {session.planTemplate?.trim()
                    ? renderPlanSection(session.planTemplate)
                    : (
                        <>
                            {questions.map(q => renderQuestionCard(q))}
                            {codingTasks.length > 0 && (
                                <>
                                    <h3>Coding Tasks</h3>
                                    {codingTasks.map(ct => renderCodingTaskCard(ct))}
                                </>
                            )}
                        </>
                    )
                }
            </div>

            <div className={styles.actions}>
                <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
                {!isCompleted && (
                    <Button variant="success" size="sm" onClick={handleComplete}>Complete Interview</Button>
                )}
                {isCompleted && (
                    <Button variant="secondary" size="sm" onClick={() => setAiDialogOpen(true)}>
                        Generate AI Evaluation Prompt
                    </Button>
                )}
            </div>

            {isCompleted && (
                <>
                    <div className={styles.summary}>
                        <h3>Interview Summary</h3>
                        <div>Questions Score: {score.toFixed(1)} / {max.toFixed(1)} ({pct}%)</div>
                        {codingTasks.length > 0 && <div>Coding Tasks Score: {codingScore.toFixed(1)}</div>}
                        <div>Combined Score: {(score + codingScore).toFixed(1)}</div>
                        <div>
                            {(['CORRECT', 'PARTIAL', 'INCORRECT', 'NOT_ASKED'] as const).map(s => {
                                const count = questions.filter(q => q.answerStatus === s).length
                                if (!count) return null
                                return <span key={s} style={{ marginRight: 'var(--space-sm)' }}>{s.replace('_', ' ')}: {count}</span>
                            })}
                        </div>
                    </div>

                    <div>
                        <h3>Feedback</h3>
                        <TextArea
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Enter feedback, recommendations or evaluation notes..."
                        />
                        <Button variant="primary" size="sm" style={{ marginTop: 'var(--space-sm)' }} onClick={async () => {
                            if (!id) return
                            try {
                                await interviewSessionsApi.update(id, { feedback })
                                showSuccess('Feedback saved.')
                            } catch { showError('Failed to save feedback') }
                        }}>Save Feedback</Button>
                    </div>
                </>
            )}

            <Dialog
                open={aiDialogOpen}
                title="AI Evaluation Prompt"
                onClose={() => setAiDialogOpen(false)}
                onConfirm={() => setAiDialogOpen(false)}
                confirmLabel="Close"
            >
                <textarea
                    className={styles.aiPromptArea}
                    readOnly
                    value={buildAiPrompt()}
                />
            </Dialog>
        </div>
    )
}
