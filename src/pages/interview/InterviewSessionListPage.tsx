import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/ui/Notification'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { interviewSessionsApi, InterviewSessionDto } from '../../api/interview'
import { toPage } from '../../api/crud'
import styles from './InterviewSessionListPage.module.css'

export function InterviewSessionListPage() {
    const navigate = useNavigate()
    const { showError } = useNotification()
    const [sessions, setSessions] = useState<InterviewSessionDto[]>([])
    const [loading, setLoading] = useState(false)

    const load = () => {
        setLoading(true)
        interviewSessionsApi.getAll({ page: 0, size: 1000 })
            .then(res => {
                const p = toPage(res.data)
                const sorted = [...p.content].sort((a, b) => {
                    if (!a.modificationDate) return 1
                    if (!b.modificationDate) return -1
                    return b.modificationDate.localeCompare(a.modificationDate)
                })
                setSessions(sorted)
            })
            .catch(() => showError('Failed to load sessions'))
            .finally(() => setLoading(false))
    }

    useEffect(load, [])

    const statusColor = (status: string) => {
        if (status === 'IN_PROGRESS') return 'info'
        if (status === 'COMPLETED') return 'success'
        return 'neutral'
    }

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleString()
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h2>Interview Sessions</h2>
                <Button variant="primary" size="sm" onClick={() => navigate('/interview/start')}>
                    New Interview
                </Button>
            </div>

            {loading && <div className={styles.loading}>Loading...</div>}

            {!loading && sessions.length === 0 && (
                <div className={styles.empty}>No sessions yet. Start your first interview!</div>
            )}

            <div className={styles.list}>
                {sessions.map(s => (
                    <div
                        key={s.id}
                        className={styles.card}
                        onClick={() => navigate(`/interview/sessions/${s.id}`)}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.candidateName}>{s.candidateName}</span>
                            <Badge color={statusColor(s.status)}>{s.status.replace('_', ' ')}</Badge>
                        </div>
                        <div className={styles.cardMeta}>
                            <span>Config: {s.configName || '—'}</span>
                            <span>Questions: {s.totalQuestions ?? 0}</span>
                            {s.mainTags && <span>Tags: {s.mainTags}</span>}
                            <span className={styles.date}>{formatDate(s.modificationDate)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
