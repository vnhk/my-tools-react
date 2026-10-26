import { Button } from '../../components/ui/Button'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'

export interface TrashConflictItem {
    metadataId: string
    filename: string
    path: string
}

export interface TrashConflictData {
    conflict: boolean
    inTrash: boolean
    zipConflict?: boolean
    metadataId?: string
    filename?: string
    path?: string
    message: string
    trashViewUrl?: string
    conflicts?: TrashConflictItem[]
}

interface TrashConflictModalProps {
    data: TrashConflictData
    onCancel: () => void
    onContinue: () => void
}

export function TrashConflictModal({ data, onCancel, onContinue }: TrashConflictModalProps) {
    const isZip = Boolean(data.zipConflict && data.conflicts && data.conflicts.length > 0)

    return (
        <DynamicFormDialog
            open
            title="File in Trash Conflict"
            onClose={onCancel}
            width="min(90vw, 540px)"
            footer={
                <>
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={onContinue}>
                        Continue (Permanently overwrite)
                    </Button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0, lineHeight: 1.5 }}>
                    A file with the given name and path is currently in the trash. Continue if you want to permanently delete the file in the trash, or cancel if you don't want to.
                </p>

                {isZip ? (
                    <div>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                            Conflicting files in trash ({data.conflicts!.length}):
                        </div>
                        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
                            {data.conflicts!.map((c) => (
                                <div key={c.metadataId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 'var(--font-size-xs)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{c.path}{c.filename}</span>
                                    <a
                                        href={`/files?view=trash&highlight=${c.metadataId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--color-primary)', textDecoration: 'underline', marginLeft: 12, flexShrink: 0 }}
                                    >
                                        View in Trash ↗
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                            Conflicting file:
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                            {data.path}{data.filename}
                        </div>
                        {data.metadataId && (
                            <div style={{ marginTop: 8 }}>
                                <a
                                    href={`/files?view=trash&highlight=${data.metadataId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', textDecoration: 'underline' }}
                                >
                                    Open file in Trash (new tab) ↗
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DynamicFormDialog>
    )
}
