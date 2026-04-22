import { type BusinessEventSourceItemChangeKind } from './business-event-source-card-diff'

export function rowToneClass(
  changeType?: BusinessEventSourceItemChangeKind | null
) {
  switch (changeType) {
    case 'added':
      return 'border-emerald-300 bg-emerald-50/80'
    case 'updated':
      return 'border-amber-300 bg-amber-50/80'
    case 'reordered':
      return 'border-sky-300 bg-sky-50/80'
    default:
      return 'border-muted/30 bg-muted/10'
  }
}

export function readonlyFieldClass(locked?: boolean) {
  return locked ? 'bg-muted/40 text-muted-foreground cursor-not-allowed' : ''
}
