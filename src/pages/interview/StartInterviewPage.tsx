import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { CustomSelect } from '../../components/fields/CustomSelect'
import { interviewQuestionsApi, codingTasksApi, questionConfigsApi, interviewSessionsApi, InterviewQuestion, CodingTask, QuestionConfig } from '../../api/interview'
import { toPage } from '../../api/crud'
import styles from './StartInterviewPage.module.css'

const SKILL_LEVELS = [
    { value: 'JUNIOR', label: 'Junior', difficulties: [1, 2] },
    { value: 'MID', label: 'Mid', difficulties: [2, 3, 4] },
    { value: 'SENIOR', label: 'Senior', difficulties: [3, 4, 5] },
    { value: 'LEAD', label: 'Lead', difficulties: [4, 5] },
]

const DIFFICULTY_COLORS: Record<number, string> = {
    1: 'var(--color-success)',
    2: 'var(--color-info)',
    3: 'var(--color-warning)',
    4: 'var(--color-danger)',
    5: 'var(--color-danger)',
}

interface SkillRow {
    id: number
    tag: string
    level: string
    count: number
}

export function StartInterviewPage() {
    const navigate = useNavigate()
    const { showWarning, showError } = useNotification()

    const [configs, setConfigs] = useState<QuestionConfig[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [selectedConfig, setSelectedConfig] = useState<QuestionConfig | null>(null)
    const [candidateName, setCandidateName] = useState('')
    const [skillRows, setSkillRows] = useState<SkillRow[]>([{ id: 1, tag: '', level: 'MID', count: 5 }])
    const [nextId, setNextId] = useState(2)

    const [selectedQuestions, setSelectedQuestions] = useState<InterviewQuestion[]>([])
    const [selectedCodingTasks, setSelectedCodingTasks] = useState<CodingTask[]>([])
    const [warnings, setWarnings] = useState<string[]>([])
    const [generated, setGenerated] = useState(false)
    const [creating, setCreating] = useState(false)

    const [addQDialogOpen, setAddQDialogOpen] = useState(false)
    const [addQSearch, setAddQSearch] = useState('')
    const [addQResults, setAddQResults] = useState<InterviewQuestion[]>([])

    useEffect(() => {
        questionConfigsApi.getAll({ page: 0, size: 1000 }).then(res => {
            setConfigs(toPage(res.data).content)
        })
        interviewQuestionsApi.getTags().then(res => setTags(res.data))
    }, [])

    useEffect(() => {
        if (addQSearch.length < 2) { setAddQResults([]); return }
        const usedIds = new Set(selectedQuestions.map(q => q.id))
        interviewQuestionsApi.getAll({ page: 0, size: 200 })
            .then(res => {
                const all = toPage(res.data).content
                setAddQResults(
                    all
                        .filter(q => !usedIds.has(q.id))
                        .filter(q => q.name?.toLowerCase().includes(addQSearch.toLowerCase()))
                        .slice(0, 20)
                )
            })
    }, [addQSearch])

    const addSkillRow = () => {
        setSkillRows(r => [...r, { id: nextId, tag: '', level: 'MID', count: 5 }])
        setNextId(n => n + 1)
    }

    const removeSkillRow = (id: number) => setSkillRows(r => r.filter(row => row.id !== id))

    const updateSkillRow = (id: number, field: keyof SkillRow, value: string | number) => {
        setSkillRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row))
    }

    const handleGenerate = async () => {
        if (!selectedConfig) { showWarning('Please select an interview config.'); return }
        const validRows = skillRows.filter(r => r.tag && r.level && r.count > 0)
        if (!validRows.length) { showWarning('Please configure at least one skill.'); return }

        const newWarnings: string[] = []
        const usedIds = new Set<string>()
        const pickedQuestions: InterviewQuestion[] = []

        for (const row of validRows) {
            const levelObj = SKILL_LEVELS.find(l => l.value === row.level)!
            const pool: InterviewQuestion[] = []
            for (const diff of levelObj.difficulties) {
                try {
                    const res = await interviewQuestionsApi.getByTagAndDifficulty(row.tag, diff)
                    res.data.filter(q => !usedIds.has(q.id)).forEach(q => pool.push(q))
                } catch { /* ignore */ }
            }
            const shuffled = [...pool].sort(() => Math.random() - 0.5)
            const picked = shuffled.slice(0, row.count)
            picked.forEach(q => usedIds.add(q.id))
            pickedQuestions.push(...picked)
            if (picked.length < row.count) {
                newWarnings.push(`Missing ${row.count - picked.length} question(s) for ${row.tag} / ${row.level} (needed ${row.count}, found ${pool.length})`)
            }
        }

        pickedQuestions.sort((a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0))
        setSelectedQuestions(pickedQuestions)
        setWarnings(newWarnings)

        const codingAmount = selectedConfig.codingTasksAmount ?? 0
        if (codingAmount > 0) {
            const ctRes = await codingTasksApi.getAll({ page: 0, size: 1000 })
            const allTasks = toPage(ctRes.data).content
            const shuffledTasks = [...allTasks].sort(() => Math.random() - 0.5)
            setSelectedCodingTasks(shuffledTasks.slice(0, codingAmount))
        } else {
            setSelectedCodingTasks([])
        }

        setGenerated(true)
    }

    const moveQuestion = (idx: number, dir: -1 | 1) => {
        setSelectedQuestions(qs => {
            const next = [...qs]
            const tmp = next[idx]
            next[idx] = next[idx + dir]
            next[idx + dir] = tmp
            return next
        })
    }

    const removeQuestion = (idx: number) => setSelectedQuestions(qs => qs.filter((_, i) => i !== idx))

    const moveCodingTask = (idx: number, dir: -1 | 1) => {
        setSelectedCodingTasks(cts => {
            const next = [...cts]
            const tmp = next[idx]
            next[idx] = next[idx + dir]
            next[idx + dir] = tmp
            return next
        })
    }

    const removeCodingTask = (idx: number) => setSelectedCodingTasks(cts => cts.filter((_, i) => i !== idx))

    const handleStart = async () => {
        if (!selectedQuestions.length) { showWarning('No questions selected.'); return }
        setCreating(true)
        try {
            const validRows = skillRows.filter(r => r.tag && r.level && r.count > 0)
            const skillLevelConfig = validRows.map(r => `${r.tag}:${r.level}:${r.count}`).join('|')
            const allTagsStr = [...new Set(validRows.map(r => r.tag))].join(', ')
            const res = await interviewSessionsApi.create({
                candidateName: candidateName || 'Unknown',
                configName: selectedConfig?.name ?? '',
                mainTags: allTagsStr,
                secondaryTags: '',
                skillLevelConfig,
                questionIds: selectedQuestions.map(q => q.id),
                codingTaskIds: selectedCodingTasks.map(ct => ct.id),
            })
            navigate(`/interview/sessions/${res.data.id}`)
        } catch {
            showError('Failed to start session')
            setCreating(false)
        }
    }

    const configOptions = configs.map(c => ({ value: c.id, label: c.name }))
    const tagOptions = tags.map(t => ({ value: t, label: t }))
    const levelOptions = SKILL_LEVELS.map(l => ({ value: l.value, label: l.label }))

    return (
        <div className={styles.page}>
            <h2>Start Interview</h2>

            <div className={styles.row}>
                <div style={{ flex: 1 }}>
                    <label className={styles.label}>Interview Config</label>
                    <CustomSelect
                        options={configOptions}
                        value={selectedConfig?.id ?? ''}
                        onChange={v => setSelectedConfig(configs.find(c => c.id === v) ?? null)}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <TextField
                        label="Candidate Name"
                        value={candidateName}
                        onChange={e => setCandidateName(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <h4 className={styles.sectionTitle}>Skill Configuration</h4>
                <div className={styles.skillHeader}>
                    <span className={styles.colHeader} style={{ flex: 2 }}>Tag</span>
                    <span className={styles.colHeader} style={{ flex: 1 }}>Level</span>
                    <span className={styles.colHeader} style={{ width: 80 }}>Count</span>
                    <span style={{ width: 32 }} />
                </div>
                {skillRows.map(row => (
                    <div key={row.id} className={styles.skillRow}>
                        <div style={{ flex: 2 }}>
                            <CustomSelect
                                options={tagOptions}
                                value={row.tag}
                                onChange={v => updateSkillRow(row.id, 'tag', String(v))}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomSelect
                                options={levelOptions}
                                value={row.level}
                                onChange={v => updateSkillRow(row.id, 'level', String(v))}
                            />
                        </div>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={row.count}
                            className={styles.countInput}
                            onChange={e => updateSkillRow(row.id, 'count', Math.max(1, Number(e.target.value)))}
                        />
                        <button className={styles.removeBtn} onClick={() => removeSkillRow(row.id)}>✕</button>
                    </div>
                ))}
                <div className={styles.skillActions}>
                    <Button variant="secondary" size="sm" onClick={addSkillRow}>+ Add Skill</Button>
                    <Button variant="primary" size="sm" onClick={handleGenerate}>Generate Questions</Button>
                </div>
            </div>

            {warnings.length > 0 && (
                <div className={styles.warnings}>
                    <strong>Warnings:</strong>
                    {warnings.map((w, i) => <div key={i}>{w}</div>)}
                </div>
            )}

            {generated && (
                <>
                    <div>
                        <div className={styles.reviewHeader}>
                            <h3>Review Questions ({selectedQuestions.length})</h3>
                            <Button variant="secondary" size="sm" onClick={() => setAddQDialogOpen(true)}>+ Add Question</Button>
                        </div>
                        {selectedQuestions.map((q, idx) => (
                            <div key={q.id} className={styles.reviewCard}>
                                <div className={styles.reviewRow}>
                                    <div className={styles.reorderBtns}>
                                        {idx > 0 && <button className={styles.orderBtn} onClick={() => moveQuestion(idx, -1)}>↑</button>}
                                        {idx < selectedQuestions.length - 1 && <button className={styles.orderBtn} onClick={() => moveQuestion(idx, 1)}>↓</button>}
                                    </div>
                                    <span className={styles.reviewNum}>#{idx + 1}</span>
                                    <span className={styles.reviewName}>{q.name}</span>
                                    <span className={styles.diffBadge} style={{ color: DIFFICULTY_COLORS[q.difficulty ?? 1], borderColor: DIFFICULTY_COLORS[q.difficulty ?? 1] }}>
                                        Lvl {q.difficulty}
                                    </span>
                                    {q.tags && <span className={styles.reviewTags}>{q.tags}</span>}
                                    {(q.maxPoints ?? 0) > 0 && <span className={styles.reviewTags}>{q.maxPoints} pts</span>}
                                    <button className={styles.removeBtn} onClick={() => removeQuestion(idx)}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedCodingTasks.length > 0 && (
                        <div>
                            <h3>Coding Tasks ({selectedCodingTasks.length})</h3>
                            {selectedCodingTasks.map((ct, idx) => (
                                <div key={ct.id} className={`${styles.reviewCard} ${styles.codingCard}`}>
                                    <div className={styles.reviewRow}>
                                        <div className={styles.reorderBtns}>
                                            {idx > 0 && <button className={styles.orderBtn} onClick={() => moveCodingTask(idx, -1)}>↑</button>}
                                            {idx < selectedCodingTasks.length - 1 && <button className={styles.orderBtn} onClick={() => moveCodingTask(idx, 1)}>↓</button>}
                                        </div>
                                        <span className={styles.reviewNum} style={{ color: 'var(--color-primary)' }}>#{idx + 1}</span>
                                        <span className={styles.reviewName}>{ct.name}</span>
                                        <span className={styles.diffBadge} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>Coding</span>
                                        <button className={styles.removeBtn} onClick={() => removeCodingTask(idx)}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.summary}>
                        Total: {selectedQuestions.length} questions
                        {selectedCodingTasks.length > 0 && ` + ${selectedCodingTasks.length} coding tasks`}
                    </div>

                    <div>
                        <Button variant="success" size="md" onClick={handleStart} disabled={creating}>
                            {creating ? 'Starting...' : 'Start Interview Session'}
                        </Button>
                    </div>
                </>
            )}

            {addQDialogOpen && (
                <div className={styles.dialogOverlay} onClick={() => setAddQDialogOpen(false)}>
                    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                        <h3>Add Question</h3>
                        <TextField
                            label="Search by name"
                            value={addQSearch}
                            onChange={e => setAddQSearch(e.target.value)}
                        />
                        <div className={styles.dialogResults}>
                            {addQResults.map(q => (
                                <div key={q.id} className={styles.dialogResult}>
                                    <span style={{ flex: 1 }}>{q.name} (L{q.difficulty})</span>
                                    <span className={styles.reviewTags}>{q.tags}</span>
                                    <Button variant="primary" size="sm" onClick={() => {
                                        setSelectedQuestions(qs => [...qs, q].sort((a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0)))
                                        setAddQSearch('')
                                        setAddQDialogOpen(false)
                                    }}>Add</Button>
                                </div>
                            ))}
                            {addQSearch.length >= 2 && addQResults.length === 0 && (
                                <div style={{ color: 'var(--color-text-tertiary)' }}>No matching questions found.</div>
                            )}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setAddQDialogOpen(false)}>Close</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
