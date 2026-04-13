import { DataTimeline } from '@/features/audit-timeline/components/data-timeline'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'

interface CustomerAuditTimelineSheetProps {
  customerId?: string
  customerName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerAuditTimelineSheet({
  customerId,
  customerName,
  open,
  onOpenChange,
}: CustomerAuditTimelineSheetProps) {
  if (!customerId) {
    return null
  }

  return (
    <DataTimeline
      module={AUDIT_MODULES.customer}
      targetId={customerId}
      targetName={customerName}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
