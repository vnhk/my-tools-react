import { useEffect, useState } from 'react'
import { useNotification } from '../../components/ui/Notification'
import { Button } from '../../components/ui/Button'
import { interviewPlanApi } from '../../api/interview'
import styles from './InterviewPlanPage.module.css'

const PLACEHOLDER = `Enter your interview plan template here.

Available placeholders:
  {candidateName}    - Candidate's name
  {configName}       - Config name
  {mainTags}         - Main skills
  {secondaryTags}    - Secondary skills
  {totalQuestions}   - Total number of questions
  {questions}        - Question cards will be rendered here
  {codingTasks}      - Coding task cards will be rendered here

Example:
  Welcome {candidateName}!

  Today we will cover: {mainTags}

  {questions}

  Coding section:
  {codingTasks}`

export function InterviewPlanPage() {
    const { showSuccess, showError } = useNotification()
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        interviewPlanApi.get()
            .then(res => setContent(res.data.content ?? ''))
            .catch(() => showError('Failed to load interview plan'))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            await interviewPlanApi.save(content)
            showSuccess('Interview plan saved.')
        } catch {
            showError('Failed to save interview plan')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h2>Interview Plan Template</h2>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </div>
            <p className={styles.hint}>
                Define a reusable interview script. Use <code>{`{questions}`}</code> and <code>{`{codingTasks}`}</code> as placeholders where question and task cards should appear.
            </p>
            <textarea
                className={styles.editor}
                value={loading ? '' : content}
                placeholder={PLACEHOLDER}
                onChange={e => setContent(e.target.value)}
                disabled={loading}
            />
        </div>
    )
}
