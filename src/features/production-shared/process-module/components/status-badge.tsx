import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { sharedProcessNodeStatusMap } from '../status-mapping'
import type { ProcessTreeNodeStatus } from '../config'

type ProcessStatusBadgeProps = {
  status: ProcessTreeNodeStatus
  label?: string
}

export function ProcessStatusBadge({ status, label }: ProcessStatusBadgeProps) {
  const meta = sharedProcessNodeStatusMap[status]

  return (
    <Badge variant='outline' className={cn('rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest', meta.className)}>
      {meta.label}
      {label ? ` · ${label}` : ''}
    </Badge>
  )
}
