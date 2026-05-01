import { Badge } from './Badge'

type Color = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const COLORS: Record<string, Color> = {
  // Task / project statuses
  'Open':        'info',
  'In Progress': 'warning',
  'Done':        'success',
  'Canceled':    'neutral',
  // Priorities
  'Low':      'neutral',
  'Medium':   'warning',
  'High':     'danger',
  'Critical': 'danger',
}

interface StatusBadgeProps {
  value: string | null | undefined
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const color = COLORS[value ?? ''] ?? 'neutral'
  return <Badge color={color}>{value ?? '—'}</Badge>
}
